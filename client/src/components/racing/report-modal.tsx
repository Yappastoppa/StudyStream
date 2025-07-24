import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Video, Shield, X } from "lucide-react";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (type: string, description: string, lat: number, lng: number) => void;
  currentLocation: { lat: number; lng: number } | null;
}

export function ReportModal({ isOpen, onClose, onSubmit, currentLocation }: ReportModalProps) {
  const [selectedType, setSelectedType] = useState<string>("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!selectedType || !currentLocation) return;
    
    onSubmit(selectedType, description, currentLocation.lat, currentLocation.lng);
    
    // Reset form
    setSelectedType("");
    setDescription("");
    onClose();
  };

  const alertTypes = [
    { id: "camera", label: "Camera", icon: Video, color: "racing-amber" },
    { id: "checkpoint", label: "Checkpoint", icon: Shield, color: "racing-red" }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-racing-dark border-racing-steel/30 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Report Alert</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="block text-sm font-medium text-racing-gray mb-2">
              Alert Type
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {alertTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedType === type.id;
                
                return (
                  <Button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    variant="outline"
                    className={`p-3 border transition-colors text-center ${
                      isSelected
                        ? `bg-${type.color}/20 border-${type.color} hover:bg-${type.color}/20`
                        : 'bg-racing-steel/30 border-racing-gray/30 hover:bg-racing-steel/50 hover:border-racing-gray/50'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-1">
                      <Icon className={`w-5 h-5 ${isSelected ? `text-${type.color}` : 'text-white'}`} />
                      <span className="text-sm">{type.label}</span>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
          
          <div>
            <Label className="block text-sm font-medium text-racing-gray mb-2">
              Additional Notes
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-racing-steel/30 border-racing-gray/30 text-white placeholder-racing-gray/50 focus:border-racing-blue resize-none"
              rows={3}
              placeholder="Optional details..."
            />
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
              disabled={!selectedType || !currentLocation}
              className="flex-1 bg-racing-amber hover:bg-racing-amber/80 text-racing-dark font-semibold"
            >
              Submit Report
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
