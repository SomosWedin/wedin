'use client';

import GuestHero from '@/components/guest/guest-hero';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Event, Image as ImageModel, User } from '@prisma/client';
import { IoEyeOutline } from 'react-icons/io5';

type EventCoverPreviewDialogProps = {
  event: Event & { users: User[] };
  images: Pick<ImageModel, 'id' | 'url'>[];
  coverMessage: string;
};

const EventCoverPreviewDialog = ({
  event,
  images,
  coverMessage,
}: EventCoverPreviewDialogProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          Vista previa
          <IoEyeOutline className="text-xl" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl gap-0 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Así lo verán tus invitados</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto">
          <GuestHero event={{ ...event, images, coverMessage }} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventCoverPreviewDialog;
