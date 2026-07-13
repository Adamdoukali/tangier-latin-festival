import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { z } from "zod";
import { useEffect } from "react";
import { translations, Language } from "../lib/translations";
import { rememberReferral } from "../lib/admin-store";

import appCss from "../styles.css?url";

const rootSearchSchema = z.object({
  lang: z.enum(["en", "fr", "es"]).optional(),
});

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-4 p-4 bg-red-950/20 text-red-500 rounded text-left overflow-auto text-xs font-mono">
          <p className="font-bold">{error.name}: {error.message}</p>
          <pre className="mt-2">{error.stack}</pre>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  validateSearch: (search) => rootSearchSchema.parse(search),
  head: (ctx) => {
    const search = (ctx.search || {}) as { lang?: string };
    const lang = (search?.lang || "en") as Language;
    const dict = translations[lang] || translations.en;

    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: dict.seoHomeTitle },
        { name: "description", content: dict.seoHomeDesc },
        { name: "author", content: "Adamdoukali" },
        { property: "og:title", content: dict.seoHomeTitle },
        { property: "og:description", content: dict.seoHomeDesc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:site", content: "@Adamdoukali" },
        { name: "twitter:title", content: dict.seoHomeTitle },
        { name: "twitter:description", content: dict.seoHomeDesc },
        {
          property: "og:image",
          content: "/favicon.png",
        },
        {
          name: "twitter:image",
          content: "/favicon.png",
        },
      ],
      links: [
        {
          rel: "stylesheet",
          href: appCss,
        },
        { rel: "icon", type: "image/png", href: "/favicon.png?v=2" },
        { rel: "apple-touch-icon", href: "/favicon.png?v=2" },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const search = router.state.location.search as { lang?: string };
  const lang = (search.lang || "en") as Language;

  return (
    <html lang={lang}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const searchStr = router.state.location.searchStr;

  // Remember ?ref=CODE from collaborator referral links so bookings
  // made later in the session are attributed to that collaborator.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) rememberReferral(ref);
  }, [searchStr]);

  // Browser auto-translate (Google Translate etc.) rewrites React-managed
  // text nodes; the next re-render then crashes the whole page with
  // "The node to be removed is not a child of this node". Make DOM
  // removals/insertions tolerant of externally-moved nodes.
  useEffect(() => {
    if (typeof Node === "undefined") return;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const w = window as any;
    if (w.__tlfDomPatched) return;
    w.__tlfDomPatched = true;
    const origRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function (this: Node, child: any) {
      if (child.parentNode !== this) return child;
      return origRemoveChild.call(this, child);
    } as any;
    const origInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function (this: Node, node: any, refNode: any) {
      if (refNode && refNode.parentNode !== this) {
        return origInsertBefore.call(this, node, null);
      }
      return origInsertBefore.call(this, node, refNode);
    } as any;
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
