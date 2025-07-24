import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDistance } from "@/lib/utils";

interface UserListModalProps {
  isOpen: boolean;
  onClose: () => void;
  nearbyUsers: Array<{
    id: number;
    username: string;
    distance: number;
    isGhostMode?: boolean;
  }>;
  onChallengeUser: (userId: number) => void;
}

export function UserListModal({ isOpen, onClose, nearbyUsers, onChallengeUser }: UserListModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-racing-dark border-racing-steel/30 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Nearby Racers</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          {nearbyUsers.length === 0 ? (
            <div className="text-center py-8 text-racing-gray">
              No nearby racers found
            </div>
          ) : (
            nearbyUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 bg-racing-steel/20 rounded-lg border border-racing-gray/20"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    user.isGhostMode 
                      ? 'bg-racing-gray' 
                      : 'bg-racing-green animate-pulse'
                  }`} />
                  <div>
                    <div className="font-medium text-white">{user.username}</div>
                    <div className="text-sm text-racing-gray">
                      {formatDistance(user.distance / 1000)} away • {user.isGhostMode ? 'Ghost' : 'Live'}
                    </div>
                  </div>
                </div>
                
                {user.isGhostMode ? (
                  <Button
                    disabled
                    size="sm"
                    className="bg-racing-steel/30 text-racing-gray px-3 py-1 rounded-full text-sm font-medium cursor-not-allowed"
                  >
                    Hidden
                  </Button>
                ) : (
                  <Button
                    onClick={() => onChallengeUser(user.id)}
                    size="sm"
                    className="bg-racing-red/20 hover:bg-racing-red/30 text-racing-red px-3 py-1 rounded-full text-sm font-medium"
                  >
                    Challenge
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
