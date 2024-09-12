import wedinIcon from '@/public/w-icon.svg';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { CiHeart } from 'react-icons/ci';
import { FaChevronRight } from 'react-icons/fa6';
import { GiWineGlass } from 'react-icons/gi';

export default function StepOne() {
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
        <Card className="w-64 bg-gray50 border-gray200 hover:bg-gray200 transition-all cursor-pointer rounded-2xl">
          <CardHeader>
            <CiHeart className="text-4xl" />
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-textPrimary">Un casamiento</h1>
            <FaChevronRight className='text-sm' />
          </CardContent>
        </Card>

        <div className="h-12 border-r border-gray200 sm:block hidden"></div>

        <Card className="w-64 bg-gray50 border-gray200 hover:bg-gray200 transition-all cursor-pointer rounded-2xl">
          <CardHeader>
            <GiWineGlass className="text-4xl" />
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-textPrimary">Otro tipo de evento</h1>
            <FaChevronRight className='text-sm' />
          </CardContent>
        </Card>
      </div>

      <div className="absolute bottom-0 flex gap-3">
        <div className="h-2 w-2 bg-slate400 rounded-full"></div>
        <div className="h-2 w-2 bg-slate300 rounded-full"></div>
        <div className="h-2 w-2 bg-slate300 rounded-full"></div>
        <div className="h-2 w-2 bg-slate300 rounded-full"></div>
        <div className="h-2 w-2 bg-slate300 rounded-full"></div>
      </div>
    </div>
  );
}
