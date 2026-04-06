import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">penny-wise</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your financially-savvy best friend
        </p>
      </div>
      <SignIn />
    </div>
  );
}
