import React from "react";
import srdLicense from "../../shared/third-party/srd/LICENSE.md";

const licenses = {
  "CC-BY-NC-ND 4.0": {
    name: "CC-BY-NC-ND 4.0",
    url: "https://creativecommons.org/licenses/by-nc-nd/4.0/",
  },
  "CC-BY 3.0": {
    name: "CC-BY 3.0",
    url: "https://creativecommons.org/licenses/by/3.0/",
  },
  CC0: {
    name: "CC0",
    url: "https://creativecommons.org/publicdomain/zero/1.0/",
  },
};

//cspell: disable
const gameIconsNetAuthors = {
  Cathelineau: { license: licenses["CC-BY 3.0"], url: null },
  Delapouite: {
    license: licenses["CC-BY 3.0"],
    url: "https://delapouite.com",
  },
  Faithtoken: {
    license: licenses["CC-BY 3.0"],
    url: "http://fungustoken.deviantart.com",
  },
  Lorc: {
    license: licenses["CC-BY 3.0"],
    url: "http://lorcblog.blogspot.com",
  },
  Skoll: { license: licenses["CC-BY 3.0"], url: null },
};

const audio = [
  {
    title: "Click.wav",
    author: "kwahmah_02",
    url: "https://freesound.org/s/256116/",
    license: licenses["CC0"],
  },
  {
    title: "up3.mp3",
    author: "stwime",
    url: "https://freesound.org/s/545373/",
    license: licenses["CC0"],
  },
  {
    title: "tada1.wav",
    author: "jobro",
    url: "https://freesound.org/s/60443/",
    license: licenses["CC-BY 3.0"],
  },
  {
    title: "10 minute ambiences",
    author: "Tabletop Audio",
    url: "https://tabletopaudio.com",
    license: licenses["CC-BY-NC-ND 4.0"],
  },
];
//cspell: enable

export function Acknowledgements() {
  return (
    <>
      <h3>Icons</h3>
      {/* required by the CC-BY license */}
      We use icons from{" "}
      <a href="https://game-icons.net/" target="_blank" rel="noreferrer">
        https://game-icons.net/
      </a>
      , which were created by the following authors:
      <ul>
        {Object.entries(gameIconsNetAuthors).map(([name, { license, url }]) => (
          <li key={name}>
            {name}{" "}
            {url && (
              <a href={url} target="_blank" rel="noreferrer">
                {url}
              </a>
            )}{" "}
            <License license={license} />
          </li>
        ))}
      </ul>
      Some icons for conditions were created by{" "}
      <a href="https://www.reddit.com/user/FatMani/">u/FatMani</a>{" "}
      <a href="https://www.reddit.com/r/DnD/comments/g1yb4j/5e_roll20_token_markers_conditions_damage_types/">
        on Reddit
      </a>{" "}
      based on previous work by sbed (obscured, prone), Skoll (blinded,
      deafened, disarmed, stunned), Delapouite (obscured, all cover, frightened,
      invisible, unconscious) and Lorc (charmed, concealed, exhaustion,
      grappled, half-cover, hidden, incapacitated, paralyzed, petrified,
      poisoned, raging, restrained, surprised, three-quarters-cover) published
      on <a href="https://game-icons.net/">game-icons.net</a>
      {". "}
      <License license={licenses["CC-BY 3.0"]} />
      <h3>Audio</h3>
      <ul>
        {audio.map((audio, i) => (
          <li key={i}>
            <strong>{audio.title}</strong> by <em>{audio.author}</em> from{" "}
            <a href={audio.url} target="_blank" rel="noreferrer">
              {audio.url}
            </a>{" "}
            <License license={audio.license} />
          </li>
        ))}
      </ul>
      <h3>Systems Reference Document (SRD)</h3>
      We use content from the SRD from Wizards of the Coast, which is available
      under the{" "}
      <a
        href={"https://media.wizards.com/2016/downloads/DND/SRD-OGL_V5.1.pdf"}
        target="_blank"
        rel="noreferrer"
      >
        Open Game License (OGL) Version 1.0a.
      </a>
      <pre className="whitespace-pre-wrap">{srdLicense}</pre>
    </>
  );
}

function License({ license }: { license: { url: string; name: string } }) {
  return (
    <>
      (
      <a href={license.url} target="_blank" rel="noreferrer">
        {license.name}
      </a>
      )
    </>
  );
}
