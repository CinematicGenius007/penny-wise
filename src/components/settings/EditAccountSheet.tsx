"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AccountColorPicker } from "@/components/accounts/AccountColorPicker";

interface EditAccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: {
    _id: Id<"accounts">;
    name: string;
    color: string;
  };
}

export function EditAccountSheet({ open, onOpenChange, account }: EditAccountSheetProps) {
  const update = useMutation(api.accounts.update);
  const remove = useMutation(api.accounts.remove);
  const [name, setName] = useState(account.name);
  const [color, setColor] = useState(account.color);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  async function save() {
    try {
      await update({ id: account._id, name: name.trim(), color });
      toast.success("Account updated");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update account");
    }
  }

  async function deleteAccount() {
    setConfirmDeleteOpen(false);
    try {
      await remove({ id: account._id });
      toast.success("Account removed");
      onOpenChange(false);
    } catch {
      toast.error("Failed to remove account");
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="mx-auto w-full max-w-lg rounded-t-2xl border-border bg-card">
          <SheetHeader>
            <SheetTitle>Edit Account</SheetTitle>
          </SheetHeader>
          <div className="mt-4 px-4 space-y-4">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Account name" />
            <AccountColorPicker value={color} onChange={setColor} />
            <Button className="w-full" onClick={save}>
              Save
            </Button>
            <Button variant="destructive" className="w-full" onClick={() => setConfirmDeleteOpen(true)}>
              Delete Account
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete account?"
        description="Transaction history will be preserved."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={deleteAccount}
      />
    </>
  );
}
