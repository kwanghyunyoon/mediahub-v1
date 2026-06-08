import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getIcon } from "@/lib/registry";
import Keypad from "@/components/Keypad";
import { verifyProfile, setProfilePasscode } from "@/lib/api";

export default function PasscodeDialog({ profile, open, onClose, onSuccess }) {
  const [errorKey, setErrorKey] = useState(0);
  const [busy, setBusy] = useState(false);

  if (!profile) return null;
  const Icon = getIcon(profile.icon);

  const handleSubmit = async (code) => {
    if (busy) return;
    setBusy(true);
    try {
      const data = await verifyProfile(profile.id, code);
      setProfilePasscode(profile.id, code);
      onSuccess(data);
    } catch (e) {
      setErrorKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        data-testid="passcode-dialog"
        className="bg-[#0a0a0d]/95 backdrop-blur-xl border-white/[0.06] text-white max-w-md p-8"
      >
        <DialogTitle className="sr-only">Enter passcode for {profile.name}</DialogTitle>
        <DialogDescription className="sr-only">
          Type the 4-digit passcode to access this profile.
        </DialogDescription>

        <div className="flex flex-col items-center">
          <div
            style={{ backgroundColor: profile.color }}
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-lg"
          >
            <Icon className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-light tracking-tight mb-1" data-testid="passcode-profile-name">
            {profile.name}
          </h2>
          <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-8">Enter passcode</p>

          <Keypad
            accentColor={profile.color}
            onSubmit={handleSubmit}
            errorKey={errorKey}
            testIdPrefix="profile-keypad"
          />

          <Button
            data-testid="passcode-cancel-btn"
            variant="ghost"
            onClick={onClose}
            className="mt-8 text-white/50 hover:text-white hover:bg-white/[0.05]"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
