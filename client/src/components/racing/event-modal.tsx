import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (eventData: {
    type: string;
    startTime: Date;
    targetUserId?: number;
  }) => void;
  nearbyUsers: Array<{
    id: number;
    username: string;
    distance: number;
  }>;
}

export function EventModal({ isOpen, onClose, onSubmit, nearbyUsers }: EventModalProps) {
  const [eventType, setEventType] = useState("");
  const [startDelay, setStartDelay] = useState("");
  const [targetUserId, setTargetUserId] = useState<number | undefined>(undefined);

  const handleSubmit = () => {
    if (!eventType || !startDelay) return;
    
    const delaySeconds = parseInt(startDelay);
    const startTime = new Date(Date.now() + delaySeconds * 1000);
    
    onSubmit({
      type: eventType,
      startTime,
      targetUserId: targetUserId || undefined
    });
    
    // Reset form
    setEventType("");
    setStartDelay("");
    setTargetUserId(undefined);
    onClose();
  };

  const eventTypes = [
    { value: "sprint", label: "Sprint Challenge" },
    { value: "circuit", label: "Circuit Race" },
    { value: "time_trial", label: "Time Trial" },
    { value: "distance", label: "Distance Challenge" }
  ];

  const startDelays = [
    { value: "30", label: "Now + 30 seconds" },
    { value: "60", label: "Now + 1 minute" },
    { value: "120", label: "Now + 2 minutes" },
    { value: "300", label: "Now + 5 minutes" }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-racing-dark border-racing-steel/30 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Create Event</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="block text-sm font-medium text-racing-gray mb-2">
              Event Type
            </Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="bg-racing-steel/30 border-racing-gray/30 text-white focus:border-racing-blue">
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent className="bg-racing-dark border-racing-steel/30">
                {eventTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="text-white hover:bg-racing-steel/30">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="block text-sm font-medium text-racing-gray mb-2">
              Start Time
            </Label>
            <Select value={startDelay} onValueChange={setStartDelay}>
              <SelectTrigger className="bg-racing-steel/30 border-racing-gray/30 text-white focus:border-racing-blue">
                <SelectValue placeholder="Select start delay" />
              </SelectTrigger>
              <SelectContent className="bg-racing-dark border-racing-steel/30">
                {startDelays.map((delay) => (
                  <SelectItem key={delay.value} value={delay.value} className="text-white hover:bg-racing-steel/30">
                    {delay.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="block text-sm font-medium text-racing-gray mb-2">
              Target Participant
            </Label>
            <Select value={targetUserId?.toString() || ""} onValueChange={(value) => setTargetUserId(value ? parseInt(value) : undefined)}>
              <SelectTrigger className="bg-racing-steel/30 border-racing-gray/30 text-white focus:border-racing-blue">
                <SelectValue placeholder="Select participant" />
              </SelectTrigger>
              <SelectContent className="bg-racing-dark border-racing-steel/30">
                <SelectItem value="" className="text-white hover:bg-racing-steel/30">
                  Open to all nearby
                </SelectItem>
                {nearbyUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()} className="text-white hover:bg-racing-steel/30">
                    {user.username} ({user.distance.toFixed(0)}m away)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex space-x-3 pt-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 bg-racing-steel/30 border-racing-gray/30 text-white hover:bg-racing-steel/50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!eventType || !startDelay}
              className="flex-1 bg-racing-red hover:bg-racing-red/80 text-white font-semibold"
            >
              Create Event
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
