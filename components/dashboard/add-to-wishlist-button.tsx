import { Button } from '@/components/ui/button';
import { IoAdd } from 'react-icons/io5';

export default function AddToWishlistButton() {
  return (
    <Button variant="success" size="sm" className="gap-2" type="button">
      <IoAdd />
      Agregar regalo
    </Button>
  );
}
