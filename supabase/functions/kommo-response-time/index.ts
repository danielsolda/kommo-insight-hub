import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ResponseTimeRequest {
  accessToken: string;
  accountUrl: string;
  fromTimestamp: number;
  toTimestamp: number;
  leadIds?: number[];
  businessHours?: {
    startHour: number;
    endHour: number;
    days: number[]; // 0=Sun..6=Sat
    slaMinutes: number;
  };
}

interface PairedMessage {
  leadId: number;
  incomingAt: number;
  outgoingAt: number;
  responseMinutes: number;
  responsibleUserId: number;
}

const SP_OFFSET_MS = -3 * 60 * 60 * 1000;

function toSaoPauloDate(unixSeconds: number): Date {
  const utcMs = unixSeconds * 1000;
  return new Date(utcMs + SP_OFFSET_MS);
}

function toSaoPauloHour(unixSeconds: number): number {
  return toSaoPauloDate(unixSeconds).getUTCHours();
}

function toSaoPauloDay(unixSeconds: number): number {
  return toSaoPauloDate(unixSeconds).getUTCDay();
}

function isBusinessTime(unixSeconds: number, startHour: number, endHour: number, days: number[]): boolean {
  const hour = toSaoPauloHour(unixSeconds);
  const day = toSaoPauloDay(unixSeconds);
  return days.includes(day) && hour >= startHour && hour < endHour;
}

function adjustToBusinessHour(unixSeconds: number, startHour: number, endHour: number, days: number[]): number {
  if (isBusinessTime(unixSeconds, startHour, endHour, days)) return unixSeconds;
  
  // Try advancing hour by hour up to 7 days
  let adjusted = unixSeconds;
  for (let i = 0; i < 7 * 24; i++) {
    adjusted += 3600;
    if (isBusinessTime(adjusted, startHour, endHour, days)) {
      // Snap to start of that business hour
      const hour = toSaoPauloHour(adjusted);
      if (hour > startHour) {
        // Already past start, keep as is
        return adjusted;
      }
      return adjusted;
    }
  }
  // fallback
  return unixSeconds;
}

async function fetchAllEvents(
  accountUrl: string,
  accessToken: string,
  fromTimestamp: number,
  toTimestamp: number
): Promise<any[]> {
  const allEvents: any[] = [];
  let page = 1;
  const limit = 100;

  while (true) {
    const url = `${accountUrl}/api/v4/events?filter[type][]=incoming_chat_message&filter[type][]=outgoing_chat_message&filter[type][]=entity_responsible_changed&filter[created_at][from]=${fromTimestamp}&filter[created_at][to]=${toTimestamp}&limit=${limit}&page=${page}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'KommoInsightHub/1.0'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 204) break;
        console.error('Events API error:', response.status);
        break;
      }

      const data = await response.json();
      const events = data?._embedded?.events || [];
      if (events.length === 0) break;

      allEvents.push(...events);
      if (events.length < limit) break;
      page++;
      if (page > 50) break;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        console.error('Events fetch timeout at page', page);
      }
      break;
    }
  }

  return allEvents;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accessToken, accountUrl, fromTimestamp, toTimestamp, leadIds, businessHours }: ResponseTimeRequest = await req.json();

    const filterLeadIds = leadIds && leadIds.length > 0 ? new Set(leadIds) : null;
    if (!accessToken || !accountUrl || !fromTimestamp || !toTimestamp) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startHour = businessHours?.startHour ?? 8;
    const endHour = businessHours?.endHour ?? 18;
    const days = businessHours?.days ?? [1, 2, 3, 4, 5];
    const SLA_MINUTES = businessHours?.slaMinutes ?? 10;

    console.log('Fetching response time events:', { fromTimestamp, toTimestamp, startHour, endHour, days, SLA_MINUTES });

    const events = await fetchAllEvents(accountUrl, accessToken, fromTimestamp, toTimestamp);
    console.log('Total events fetched:', events.length);

    const incomingMessages: any[] = [];
    const outgoingMessages: any[] = [];
    const responsibleChanges: any[] = [];

    for (const event of events) {
      if (event.type === 'incoming_chat_message') {
        incomingMessages.push(event);
      } else if (event.type === 'outgoing_chat_message') {
        outgoingMessages.push(event);
      } else if (event.type === 'entity_responsible_changed') {
        responsibleChanges.push(event);
      }
    }

    console.log('Incoming messages:', incomingMessages.length, 'Outgoing:', outgoingMessages.length);

    const incomingByLead = new Map<number, any[]>();
    for (const msg of incomingMessages) {
      const leadId = msg.entity_id;
      if (!incomingByLead.has(leadId)) incomingByLead.set(leadId, []);
      incomingByLead.get(leadId)!.push(msg);
    }

    const outgoingByLead = new Map<number, any[]>();
    for (const msg of outgoingMessages) {
      const leadId = msg.entity_id;
      if (!outgoingByLead.has(leadId)) outgoingByLead.set(leadId, []);
      outgoingByLead.get(leadId)!.push(msg);
    }

    const responsibleByLead = new Map<number, Array<{ at: number; userId: number }>>();
    for (const change of responsibleChanges) {
      const leadId = change.entity_id;
      if (!responsibleByLead.has(leadId)) responsibleByLead.set(leadId, []);
      const afterUserId = change.value_after?.[0]?.responsible_user_id;
      if (afterUserId) {
        responsibleByLead.get(leadId)!.push({ at: change.created_at, userId: afterUserId });
      }
    }

    const pairs: PairedMessage[] = [];

    for (const [leadId, incoming] of incomingByLead) {
      // Skip leads not in filter
      if (filterLeadIds && !filterLeadIds.has(leadId)) continue;

      const outgoing = outgoingByLead.get(leadId) || [];
      incoming.sort((a: any, b: any) => a.created_at - b.created_at);
      outgoing.sort((a: any, b: any) => a.created_at - b.created_at);

      let outIdx = 0;
      for (const inMsg of incoming) {
        while (outIdx < outgoing.length && outgoing[outIdx].created_at <= inMsg.created_at) {
          outIdx++;
        }
        if (outIdx >= outgoing.length) break;

        const outMsg = outgoing[outIdx];
        outIdx++;

        const adjustedIncoming = adjustToBusinessHour(inMsg.created_at, startHour, endHour, days);
        const adjustedOutgoing = adjustToBusinessHour(outMsg.created_at, startHour, endHour, days);
        
        const responseMinutes = Math.max(0, (adjustedOutgoing - adjustedIncoming) / 60);

        let responsibleUserId = outMsg.created_by;
        const changes = responsibleByLead.get(leadId) || [];
        if (changes.length > 0) {
          changes.sort((a, b) => a.at - b.at);
          for (const change of changes) {
            if (change.at <= inMsg.created_at) {
              responsibleUserId = change.userId;
            }
          }
        }

        pairs.push({ leadId, incomingAt: inMsg.created_at, outgoingAt: outMsg.created_at, responseMinutes, responsibleUserId });
      }
    }

    console.log('Total pairs found:', pairs.length);

    const byUser = new Map<number, PairedMessage[]>();
    for (const pair of pairs) {
      if (!byUser.has(pair.responsibleUserId)) byUser.set(pair.responsibleUserId, []);
      byUser.get(pair.responsibleUserId)!.push(pair);
    }

    const userMetrics = Array.from(byUser.entries()).map(([userId, userPairs]) => {
      const times = userPairs.map(p => p.responseMinutes).sort((a, b) => a - b);
      const total = times.length;
      const avg = times.reduce((s, t) => s + t, 0) / total;
      const median = total % 2 === 0 
        ? (times[total / 2 - 1] + times[total / 2]) / 2 
        : times[Math.floor(total / 2)];
      const p90 = times[Math.floor(total * 0.9)] || times[times.length - 1];
      const withinSla = times.filter(t => t <= SLA_MINUTES).length;

      return {
        responsibleUserId: userId,
        avgResponseMinutes: parseFloat(avg.toFixed(1)),
        medianResponseMinutes: parseFloat(median.toFixed(1)),
        p90ResponseMinutes: parseFloat(p90.toFixed(1)),
        totalMessages: total,
        withinSla,
        slaRate: parseFloat(((withinSla / total) * 100).toFixed(1))
      };
    });

    const allTimes = pairs.map(p => p.responseMinutes).sort((a, b) => a - b);
    const overallAvg = allTimes.length > 0 ? allTimes.reduce((s, t) => s + t, 0) / allTimes.length : 0;
    const overallMedian = allTimes.length > 0 
      ? (allTimes.length % 2 === 0 
        ? (allTimes[allTimes.length / 2 - 1] + allTimes[allTimes.length / 2]) / 2
        : allTimes[Math.floor(allTimes.length / 2)])
      : 0;
    const overallP90 = allTimes.length > 0 
      ? allTimes[Math.floor(allTimes.length * 0.9)] || allTimes[allTimes.length - 1]
      : 0;
    const overallWithinSla = allTimes.filter(t => t <= SLA_MINUTES).length;

    return new Response(
      JSON.stringify({
        userMetrics,
        overall: {
          avgResponseMinutes: parseFloat(overallAvg.toFixed(1)),
          medianResponseMinutes: parseFloat(overallMedian.toFixed(1)),
          p90ResponseMinutes: parseFloat(overallP90.toFixed(1)),
          totalPairs: pairs.length,
          withinSla: overallWithinSla,
          slaRate: allTimes.length > 0 ? parseFloat(((overallWithinSla / allTimes.length) * 100).toFixed(1)) : 0
        },
        totalEventsProcessed: events.length,
        slaMinutes: SLA_MINUTES
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Response time function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
