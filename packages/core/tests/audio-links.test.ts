import { describe, expect, it } from "vitest";
import {
  audioProvider,
  isAllowedAudioUrl,
  MAX_AUDIO_LINKS,
} from "../src/audio-links";

describe("audioProvider", () => {
  it("reconhece os provedores da whitelist (inclui subdomínios e mobile)", () => {
    expect(audioProvider("https://www.youtube.com/watch?v=abc")).toBe("youtube");
    expect(audioProvider("https://youtu.be/abc")).toBe("youtube");
    expect(audioProvider("https://music.youtube.com/watch?v=abc")).toBe("youtube");
    expect(audioProvider("https://open.spotify.com/track/123")).toBe("spotify");
    expect(audioProvider("https://www.deezer.com/track/123")).toBe("deezer");
    expect(audioProvider("https://soundcloud.com/artista/musica")).toBe("soundcloud");
    expect(audioProvider("https://music.apple.com/br/album/x/1")).toBe("apple-music");
  });

  it("devolve null para provedor fora da whitelist", () => {
    expect(audioProvider("https://evil.com/track")).toBeNull();
    // apple.com genérico não vale — só music.apple.com
    expect(audioProvider("https://apple.com/x")).toBeNull();
  });

  it("não cai em domínios sósia (anti-spoofing)", () => {
    expect(audioProvider("https://notyoutube.com/x")).toBeNull();
    expect(audioProvider("https://youtube.com.evil.com/x")).toBeNull();
  });

  it("devolve null para entradas inválidas ou protocolos perigosos", () => {
    expect(audioProvider("não é url")).toBeNull();
    expect(audioProvider("")).toBeNull();
    // eslint-disable-next-line no-script-url
    expect(audioProvider("javascript:alert(1)")).toBeNull();
  });
});

describe("isAllowedAudioUrl", () => {
  it("aceita os provedores conhecidos e rejeita o resto", () => {
    expect(isAllowedAudioUrl("https://youtu.be/abc")).toBe(true);
    expect(isAllowedAudioUrl("https://open.spotify.com/track/1")).toBe(true);
    expect(isAllowedAudioUrl("https://evil.com/x")).toBe(false);
    expect(isAllowedAudioUrl("ftp://youtube.com/x")).toBe(false); // protocolo não-web
  });
});

describe("MAX_AUDIO_LINKS", () => {
  it("é 3", () => {
    expect(MAX_AUDIO_LINKS).toBe(3);
  });
});
