import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">penny-wise</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Start tracking your finances for free
        </p>
      </div>
      <SignUp />
    </div>
  );
}
