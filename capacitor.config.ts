import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'SimuladorCuidadoRecienNacidoNYL',
  webDir: 'www',
  plugins: {
    Keyboard: {
      resize: "native",
      style: "dark",
      resizeOnFullScreen: true
    }
  }
};

export default config;