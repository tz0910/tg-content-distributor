import { auth } from "@/auth";

export default auth((request) => {
  const isLogin = request.nextUrl.pathname.startsWith("/login");
  const isApi = request.nextUrl.pathname.startsWith("/api");
  if (!request.auth && !isLogin && !isApi) {
    const login = new URL("/login", request.nextUrl.origin);
    return Response.redirect(login);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
