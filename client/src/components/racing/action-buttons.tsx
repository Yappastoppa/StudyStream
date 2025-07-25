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
    <div className={`bg-black/80 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-white/10 ${className}`}>
      <div className="flex flex-col gap-3">
        {/* Ghost Mode Toggle */}
        <Button
          onClick={onGhostModeToggle}
          size="sm"
          className={`w-10 h-10 min-h-[40px] p-0 rounded-lg transition-all duration-200 shrink-0 ${
            isGhostMode 
              ? 'bg-racing-blue/30 border-racing-blue/50 hover:bg-racing-blue/40 text-racing-blue' 
              : 'bg-transparent border-transparent hover:bg-racing-blue/20 text-white/70 hover:text-white'
          } border`}
          title="Ghost Mode"
        >
          <Ghost className="w-4 h-4" />
        </Button>
        
        {/* Report Alert */}
        <Button
          onClick={onReportAlert}
          size="sm"
          className="w-10 h-10 min-h-[40px] p-0 bg-transparent border-transparent rounded-lg hover:bg-racing-amber/20 transition-all duration-200 shrink-0 text-racing-amber hover:text-racing-amber"
          title="Report Alert"
        >
          <AlertTriangle className="w-4 h-4" />
        </Button>
        
        {/* Create Event */}
        <Button
          onClick={onCreateEvent}
          size="sm"
          className="w-10 h-10 min-h-[40px] p-0 bg-transparent border-transparent rounded-lg hover:bg-racing-red/20 transition-all duration-200 shrink-0 text-racing-red hover:text-racing-red"
          title="Create Event"
        >
          <Flag className="w-4 h-4" />
        </Button>
        
        {/* User List */}
        <Button
          onClick={onShowUserList}
          size="sm"
          className="w-10 h-10 min-h-[40px] p-0 bg-transparent border-transparent rounded-lg hover:bg-racing-green/20 transition-all duration-200 shrink-0 text-racing-green hover:text-racing-green"
          title="User List"
        >
          <Users className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
