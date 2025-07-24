import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Flag, History, Shield, UserPlus, HelpCircle, LogOut, KeyRound } from "lucide-react";
import type { User } from "@shared/schema";

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onLeaveSession: () => void;
  className?: string;
}

export function SideMenu({ isOpen, onClose, user, onLeaveSession, className = "" }: SideMenuProps) {
  const handleGenerateInvite = async () => {
    try {
      const response = await fetch('/api/invite-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresInHours: 48 })
      });
      
      if (response.ok) {
        const inviteCode = await response.json();
        navigator.clipboard.writeText(inviteCode.code);
        // You might want to show a toast notification here
        alert(`Invite code copied to clipboard: ${inviteCode.code}`);
      }
    } catch (error) {
      console.error('Failed to generate invite code:', error);
    }
  };

  return (
    <div className={`fixed inset-y-0 right-0 w-80 bg-racing-dark/95 backdrop-blur-md border-l border-racing-steel/30 z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'} ${className}`}>
      <div className="p-6">
        {/* Menu Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-white">Menu</h2>
          <Button
            onClick={onClose}
            size="sm"
            variant="ghost"
            className="p-2 hover:bg-racing-steel/50 rounded-lg"
          >
            <X className="w-5 h-5 text-white" />
          </Button>
        </div>
        
        {/* User Info */}
        {user && (
          <Card className="bg-racing-charcoal/50 border-racing-steel/30 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-racing-blue to-racing-red rounded-xl flex items-center justify-center">
                  <KeyRound className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-white">{user.username}</div>
                  <div className="text-sm text-racing-gray">Anonymous User</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Menu Items */}
        <nav className="space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start p-3 hover:bg-racing-steel/30 text-left"
          >
            <Flag className="w-5 h-5 text-racing-blue mr-3" />
            <span>Active Events</span>
            <span className="ml-auto bg-racing-red text-xs px-2 py-1 rounded-full">0</span>
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start p-3 hover:bg-racing-steel/30 text-left"
          >
            <History className="w-5 h-5 text-racing-green mr-3" />
            <span>Race History</span>
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start p-3 hover:bg-racing-steel/30 text-left"
          >
            <Shield className="w-5 h-5 text-racing-amber mr-3" />
            <span>Privacy Settings</span>
          </Button>
          
          <Button
            onClick={handleGenerateInvite}
            variant="ghost"
            className="w-full justify-start p-3 hover:bg-racing-steel/30 text-left"
          >
            <UserPlus className="w-5 h-5 text-racing-blue mr-3" />
            <span>Generate Invite</span>
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start p-3 hover:bg-racing-steel/30 text-left"
          >
            <HelpCircle className="w-5 h-5 text-racing-gray mr-3" />
            <span>Help & Support</span>
          </Button>
        </nav>
        
        {/* Logout */}
        <div className="absolute bottom-6 left-6 right-6">
          <Button
            onClick={onLeaveSession}
            className="w-full bg-racing-red/20 hover:bg-racing-red/30 border border-racing-red/30 text-racing-red"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Leave Session
          </Button>
        </div>
      </div>
    </div>
  );
}
