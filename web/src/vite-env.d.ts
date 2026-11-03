/// <reference types="vite/client" />
import "react";
declare module "react" {
  namespace JSX { interface IntrinsicElements { "ai-menu": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { chat?: string; research?: string };
    "app-creations": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { src?: string; heading?: string }; } }
}
