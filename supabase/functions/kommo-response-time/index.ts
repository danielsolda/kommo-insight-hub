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
}

interface PairedMessage {
  leadId: number;
  incomingAt: number;
  outgoingAt: number;
  responseMinutes: number;
  responsibleUserId: number;
}

// São Paulo timezone offset helper (UTC-3)
const SP_OFFSET_MS = -3 * 60 * 60 * 1000;

function toSaoPauloHour(unixSeconds: number): number {
  const utcMs = unixSeconds * 1000;
  const spMs = utcMs + SP_OFFSET_MS;
  return new Date(spMs).getUTCHours();
}

function isBusinessHour(unixSeconds: number): boolean {
  const hour = toSaoPauloHour(unixSeconds);
  return hour >= 8 && hour < 18;
}

// Adjust timestamp to next business hour if outside 08:00-18:00
function adjustToBusinessHour(unixSeconds: number): number {
  const hour = toSaoPauloHour(unixSeconds);
  if (hour >= 8 && hour < 18) return unixSeconds;
  
  // If before 8am, adjust to 8am same day
  if (hour < 8) {
    const diff = (8 - hour) * 3600;
    return unixSeconds + diff;
  }
  
  // If after 18:00, adjust to 8am next day
  const hoursUntilNext8 = (24 - hour + 8) * 3600;
  return unixSeconds + hoursUntilNext8;
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
      
      // Safety limit
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
    const { accessToken, accountUrl, fromTimestamp, toTimestamp }: ResponseTimeRequest = await req.json();

    if (!accessToken || !accountUrl || !fromTimestamp || !toTimestamp) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching response time events:', { fromTimestamp, toTimestamp });

    const events = await fetchAllEvents(accountUrl, accessToken, fromTimestamp, toTimestamp);
    console.log('Total events fetched:', events.length);

    // Separate event types
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

    // Group by lead (entity_id)
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

    // Build responsible history by lead
    const responsibleByLead = new Map<number, Array<{ at: number; userId: number }>>();
    for (const change of responsibleChanges) {
      const leadId = change.entity_id;
      if (!responsibleByLead.has(leadId)) responsibleByLead.set(leadId, []);
      const afterUserId = change.value_after?.[0]?.responsible_user_id;
      if (afterUserId) {
        responsibleByLead.get(leadId)!.push({
          at: change.created_at,
          userId: afterUserId
        });
      }
    }

    // Pair incoming with next outgoing per lead
    const pairs: PairedMessage[] = [];

    for (const [leadId, incoming] of incomingByLead) {
      const outgoing = outgoingByLead.get(leadId) || [];
      
      // Sort both by timestamp
      incoming.sort((a: any, b: any) => a.created_at - b.created_at);
      outgoing.sort((a: any, b: any) => a.created_at - b.created_at);

      let outIdx = 0;
      for (const inMsg of incoming) {
        // Find next outgoing message after this incoming
        while (outIdx < outgoing.length && outgoing[outIdx].created_at <= inMsg.created_at) {
          outIdx++;
        }
        if (outIdx >= outgoing.length) break;

        const outMsg = outgoing[outIdx];
        outIdx++; // consume this outgoing

        // Adjust for business hours
        const adjustedIncoming = adjustToBusinessHour(inMsg.created_at);
        const adjustedOutgoing = adjustToBusinessHour(outMsg.created_at);
        
        const responseMinutes = Math.max(0, (adjustedOutgoing - adjustedIncoming) / 60);

        // Determine responsible at time of incoming message
        let responsibleUserId = outMsg.created_by; // default to who responded
        const changes = responsibleByLead.get(leadId) || [];
        if (changes.length > 0) {
          changes.sort((a, b) => a.at - b.at);
          // Find latest change before incoming message
          for (const change of changes) {
            if (change.at <= inMsg.created_at) {
              responsibleUserId = change.userId;
            }
          }
        }

        pairs.push({
          leadId,
          incomingAt: inMsg.created_at,
          outgoingAt: outMsg.created_at,
          responseMinutes,
          responsibleUserId
        });
      }
    }

    console.log('Total pairs found:', pairs.length);

    // Aggregate by responsible user
    const byUser = new Map<number, PairedMessage[]>();
    for (const pair of pairs) {
      if (!byUser.has(pair.responsibleUserId)) byUser.set(pair.responsibleUserId, []);
      byUser.get(pair.responsibleUserId)!.push(pair);
    }

    const SLA_MINUTES = 10;

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

    // Overall metrics
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
