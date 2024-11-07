export default async function OnboardingLayout({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
      <div className="h-screen flex items-center justify-center w-full p-6 sm:p-10">
        {children}
      </div>
    );
  }
  