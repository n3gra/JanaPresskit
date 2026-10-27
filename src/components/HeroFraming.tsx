import Framing from "./Framing";
import HeroVideo from "./HeroVideo";

/*
 * The hero is structure only for now: the moving plate seen through the
 * eyepiece. Textures and stamps come back in the finishing pass, and the mark
 * moves into the menu, so the heading stays for screen readers alone.
 */
export default function HeroFraming() {
  return (
    <Framing id="hero" label="Jana" inset="wide">
      <HeroVideo />
      <h1 className="sr-only">Jana</h1>
    </Framing>
  );
}
