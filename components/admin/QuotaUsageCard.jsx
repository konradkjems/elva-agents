import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Calendar,
  BarChart3 
} from 'lucide-react';

export default function QuotaUsageCard({ 
  current = 0, 
  limit = 100, 
  percentage = 0,
  daysRemaining = 0, 
  plan = 'free',
  onUpgrade,
  onViewDetails 
}) {
  // Determine status and colors
  const getStatusInfo = () => {
    if (percentage >= 100) {
      return {
        status: 'exceeded',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        progressColor: 'bg-red-600',
        icon: AlertCircle,
        message: plan === 'free' ? 'Quota Reached - Widgets Disabled' : 'Quota Exceeded',
        badge: 'destructive'
      };
    } else if (percentage >= 80) {
      return {
        status: 'warning',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        progressColor: 'bg-yellow-600',
        icon: AlertCircle,
        message: 'Approaching Quota',
        badge: 'warning'
      };
    } else {
      return {
        status: 'ok',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        progressColor: 'bg-green-600',
        icon: CheckCircle,
        message: 'Within Quota',
        badge: 'secondary'
      };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;
  const overage = Math.max(0, current - limit);

  return (
    <Card className={`border-l-4 ${
      statusInfo.status === 'exceeded' ? 'border-l-red-500' : 
      statusInfo.status === 'warning' ? 'border-l-yellow-500' : 
      'border-l-green-500'
    }`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Conversation Usage
          </CardTitle>
          <Badge variant={statusInfo.badge} className="gap-1">
            <StatusIcon className="h-3 w-3" />
            {statusInfo.message}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {current.toLocaleString('en-US')} / {limit.toLocaleString('en-US')} conversations
            </span>
            <span className={`font-bold ${statusInfo.color}`}>
              {percentage}%
            </span>
          </div>
          
          <Progress 
            value={Math.min(percentage, 100)} 
            className="h-3"
            indicatorClassName={statusInfo.progressColor}
          />
          
          {overage > 0 && (
            <p className="text-xs text-red-600 font-medium">
              +{overage.toLocaleString('en-US')} conversations over quota
            </p>
          )}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Days Remaining
            </p>
            <p className="text-lg font-bold">{daysRemaining}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Plan
            </p>
            <p className="text-lg font-bold capitalize">{plan}</p>
          </div>
        </div>

        {/* Actions */}
        {(statusInfo.status === 'exceeded' || statusInfo.status === 'warning') && (
          <div className="pt-2 space-y-2">
            {plan === 'free' && percentage >= 100 && (
              <div className={`${statusInfo.bgColor} rounded-lg p-3`}>
                <p className={`text-xs ${statusInfo.color} font-medium`}>
                  ⚠️ Your widgets are disabled. Upgrade to continue.
                </p>
              </div>
            )}
            
            <div className="flex gap-2">
              {onUpgrade && (percentage >= 80 || plan === 'free') && (
                <Button 
                  onClick={onUpgrade} 
                  className="flex-1"
                  variant={percentage >= 100 ? "default" : "outline"}
                >
                  {percentage >= 100 ? '🚀 Upgrade Now' : '📈 View Plans'}
                </Button>
              )}
              {onViewDetails && (
                <Button 
                  onClick={onViewDetails} 
                  variant="outline"
                  className="flex-1"
                >
                  📊 Details
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

