import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { RxCross2 } from 'react-icons/rx';

type ResetEventCoverFormDialogProps = {
  handleReset: () => void;
  isDirty: boolean;
};

const ResetEventCoverFormDialog = ({ handleReset, isDirty }: ResetEventCoverFormDialogProps) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          disabled={!isDirty}
        >
          Descartar
          <RxCross2 className="text-xl" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Estas seguro que quieres descartar tus cambios?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esto hara que pierdas todos los cambios que hayas completado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReset}
            className="bg-destructive text-white hover:bg-destructive/85 transition-colors"
          >
            Si, descartar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ResetEventCoverFormDialog;
