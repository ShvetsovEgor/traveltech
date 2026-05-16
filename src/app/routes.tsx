import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { WelcomeScreen } from "./components/screens/WelcomeScreen";
import { GuideAuthScreen } from "./components/screens/GuideAuthScreen";
import { MainMenu } from "./components/screens/MainMenu";
import { NeuralArtist } from "./components/screens/NeuralArtist";
import { NeuralArtistSketch } from "./components/screens/NeuralArtistSketch";
import { NeuralArtistLoading } from "./components/screens/NeuralArtistLoading";
import { NeuralArtistResult } from "./components/screens/NeuralArtistResult";
import { NeuralBox } from "./components/screens/NeuralBox";
import { NeuralBoxGender } from "./components/screens/NeuralBoxGender";
import { NeuralBoxPhoto } from "./components/screens/NeuralBoxPhoto";
import { VideoAnimation } from "./components/screens/VideoAnimation";
import { VideoAnimationScenario } from "./components/screens/VideoAnimationScenario";
import { MiniGames } from "./components/screens/MiniGames";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: WelcomeScreen },
      { path: "guide/auth", Component: GuideAuthScreen },
      { path: "menu", Component: MainMenu },
      { path: "neural-artist", Component: NeuralArtist },
      { path: "neural-artist/sketch", Component: NeuralArtistSketch },
      { path: "neural-artist/loading", Component: NeuralArtistLoading },
      { path: "neural-artist/result", Component: NeuralArtistResult },
      { path: "neural-box", Component: NeuralBox },
      { path: "neural-box/gender", Component: NeuralBoxGender },
      { path: "neural-box/photo", Component: NeuralBoxPhoto },
      { path: "video-animation", Component: VideoAnimation },
      { path: "video-animation/scenario", Component: VideoAnimationScenario },
      { path: "mini-games", Component: MiniGames },
    ],
  },
]);
