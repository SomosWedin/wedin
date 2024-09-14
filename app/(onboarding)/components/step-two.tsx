import wedinIcon from '@/public/w-icon.svg';
import Image from 'next/image';

export default function StepTwo() {
  return (
    <div className="relative flex flex-col justify-center items-center gap-8 h-full">
      <Image src={wedinIcon} alt="wedin icon" width={78} />

      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-textSecondary text-2xl font-medium">
          ¿Que tipo de evento queres crear?
        </h1>
        <p className="text-secondary400">
          El tema de tu sitio web va a cambiar dependiendo del tipo de evento
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-8 items-center">
      </div>

      <div className="absolute bottom-0 flex gap-3">
        <div className="h-2 w-2 bg-slate300 rounded-full"></div>
        <div className="h-2 w-2 bg-slate400 rounded-full"></div>
        <div className="h-2 w-2 bg-slate300 rounded-full"></div>
        <div className="h-2 w-2 bg-slate300 rounded-full"></div>
        <div className="h-2 w-2 bg-slate300 rounded-full"></div>
      </div>
    </div>
  );
}
