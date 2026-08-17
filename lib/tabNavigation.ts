/** Match a tab route without treating similarly prefixed routes as active. */
export function matchesTabRoute(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  const route = href.endsWith("/") ? href.slice(0, -1) : href;
  return pathname === route || pathname.startsWith(`${route}/`);
}

/** Capacitor's static export stores non-root routes in route/index.html. */
export function staticTabHref(href: string): string {
  if (href === "/") return href;
  return href.endsWith("/") ? href : `${href}/`;
}
