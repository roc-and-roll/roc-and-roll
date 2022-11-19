import type { AppProps } from 'next/app'
import "modern-css-reset";
import "../../client/components/global.scss";
import "../../client/components/JoinGame.scss";
import "../../client/components/Popover.scss";
import "tippy.js/animations/scale-subtle.css";
import "../../client/components/privateChat/PrivateChats.scss";
import "../../client/components/quickReference/QuickReference.scss";

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}
export default MyApp
