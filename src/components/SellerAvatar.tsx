import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SellerAvatarProps {
  userName: string;
  avatarUrl?: string;
  rank?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const SellerAvatar = ({ 
  userName, 
  avatarUrl, 
  rank, 
  size = "md",
  className 
}: SellerAvatarProps) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "hsl(142 76% 36%)", // success
      "hsl(217 91% 60%)", // info  
      "hsl(263 70% 50%)", // primary
      "hsl(48 96% 53%)", // warning
      "hsl(320 65% 52%)", // pink
      "hsl(280 65% 60%)", // purple
    ];
    const hash = name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12", 
    lg: "h-16 w-16"
  };

  const isTopPerformer = rank && rank <= 3;

  return (
    <div className={cn("relative", className)}>
      <Avatar className={cn(
        sizeClasses[size],
        "ring-2 ring-offset-2 ring-offset-background transition-all duration-300",
        isTopPerformer 
          ? "ring-gradient-to-r from-yellow-400 to-yellow-600 shadow-lg shadow-yellow-400/25" 
          : "ring-border hover:ring-primary/50"
      )}>
        <AvatarImage 
          src={avatarUrl} 
          alt={`${userName} avatar`}
          className="object-cover"
        />
        <AvatarFallback 
          className="font-semibold text-white border-0"
          style={{ backgroundColor: getAvatarColor(userName) }}
        >
          {getInitials(userName)}
        </AvatarFallback>
      </Avatar>
      
      {/* Golden frame effect for top 3 */}
      {isTopPerformer && (
        <div className={cn(
          "absolute inset-0 rounded-full pointer-events-none",
          "bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600",
          "opacity-20 animate-pulse",
          sizeClasses[size]
        )} />
      )}
      
      {/* Crown for #1 */}
      {rank === 1 && (
        <div className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full p-1">
          <Crown className="h-3 w-3 text-yellow-900" />
        </div>
      )}
    </div>
  );
};