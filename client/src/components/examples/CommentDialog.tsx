import { useState } from "react";
import { Button } from "@/components/ui/button";
import CommentDialog from '../CommentDialog';

export default function CommentDialogExample() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Dialog</Button>
      <CommentDialog
        open={open}
        onOpenChange={setOpen}
        platform="Instagram"
        onSubmit={(count) => console.log("Submit:", count)}
      />
    </>
  );
}
