import { login } from "./actions";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <form action={login} className="w-full max-w-sm rounded-lg border border-border bg-panel p-6">
        <h1 className="text-xl font-semibold">TG 自动发布中心</h1>
        <p className="mt-1 text-sm text-slate-500">使用初始化管理员账号登录。</p>
        <label className="mt-5 block text-sm">
          邮箱
          <input name="email" type="email" required className="mt-1 w-full rounded-md border border-border px-3 py-2" />
        </label>
        <label className="mt-3 block text-sm">
          密码
          <input name="password" type="password" required className="mt-1 w-full rounded-md border border-border px-3 py-2" />
        </label>
        <button className="mt-5 w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">登录</button>
      </form>
    </main>
  );
}
