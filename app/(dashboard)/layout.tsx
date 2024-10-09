export default async function DashboardLayout({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
      <div className="flex items-start justify-center">
        {children}
      </div>
    );
  }
  