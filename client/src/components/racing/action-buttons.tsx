import { Button } from "@/components/ui/button";
import { Ghost, AlertTriangle, Flag, Users } from "lucide-react";

interface ActionButtonsProps {
  isGhostMode: boolean;
  onGhostModeToggle: () => void;
  onReportAlert: () => void;
  onCreateEvent: () => void;
  onShowUserList: () => void;
  className?: string;
}

export function ActionButtons({
  isGhostMode,
  onGhostModeToggle,
  onReportAlert,
  onCreateEvent,
  onShowUserList,
  className = ""
}: ActionButtonsProps) {
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Ghost Mode Toggle */}
      <Button
        onClick={onGhostModeToggle}
        size="sm"
        className={`w-12 h-12 min-h-[48px] p-0 rounded-xl transition-all duration-200 shrink-0 ${
          isGhostMode 
            ? 'bg-racing-blue/20 border-racing-blue/50 hover:bg-racing-blue/30' 
            : 'bg-racing-steel/80 border-racing-gray/30 hover:bg-racing-blue/20'
        } backdrop-blur-sm border`}
      >
        <Ghost className="w-5 h-5 text-white" />
      </Button>
      
      {/* Report Alert */}
      <Button
        onClick={onReportAlert}
        size="sm"
        className="w-12 h-12 min-h-[48px] p-0 bg-racing-steel/80 backdrop-blur-sm border border-racing-gray/30 rounded-xl hover:bg-racing-amber/20 transition-all duration-200 shrink-0"
      >
        <AlertTriangle className="w-5 h-5 text-racing-amber" />
      </Button>
      
      {/* Create Event */}
      <Button
        onClick={onCreateEvent}
        size="sm"
        className="w-12 h-12 min-h-[48px] p-0 bg-racing-steel/80 backdrop-blur-sm border border-racing-gray/30 rounded-xl hover:bg-racing-red/20 transition-all duration-200 shrink-0"
      >
        <Flag className="w-5 h-5 text-racing-red" />
      </Button>
      
      {/* User List */}
      <Button
        onClick={onShowUserList}
        size="sm"
        className="w-12 h-12 min-h-[48px] p-0 bg-racing-steel/80 backdrop-blur-sm border border-racing-gray/30 rounded-xl hover:bg-racing-green/20 transition-all duration-200 shrink-0"
      >
        <Users className="w-5 h-5 text-racing-green" />
      </Button>
    </div>
  );
}
