interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => {
  return (
    <div className="flex flex-col justify-center items-center h-[50vh] sm:h-[40vh] gap-8">
      <div className="flex flex-col gap-4 items-center">
        {icon}

        <h1 className="max-w-sm text-3xl font-medium text-center text-black">
          {title}
        </h1>

        {description && (
          <p className="max-w-sm text-center text-lg text-textTertiary">
            {description}
          </p>
        )}
      </div>

      {action && action}
    </div>
  );
};

export default EmptyState;
