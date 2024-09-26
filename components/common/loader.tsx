import { Loader2 } from 'lucide-react';

type LoaderProps = {
  mfHeight?: string;
};

const Loader = ({ mfHeight }: LoaderProps) => {
  const loaderHeight = mfHeight ?? 'min-h-[50vh]';

  return (
    <div className={`flex justify-center items-center ${loaderHeight} w-full`}>
      <Loader2 className="w-16 h-16 animate-spin text-borderDefault" />
    </div>
  );
};

export default Loader;
