import { useEffect, useState } from 'react';
import Image from 'next/image';
import wedinIcon from '@/public/assets/w-icon.svg';
import { Progress } from '@/components/ui/progress';

export default function StepSix() {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          location.reload();
          location.href = '/dashboard';
          return 100;
        }
        return prev + 1;
      });
    }, 40);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col justify-center items-center gap-8 h-full">
      <Image src={wedinIcon} alt="wedin icon" width={78} />
      <Progress value={progress} />
      <h2>Creando el sitio web de tu evento...</h2>
    </div>
  );
}
