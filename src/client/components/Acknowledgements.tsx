import React from "react";

const licenses = {
  "CC-BY 3.0": {
    name: "CC-BY 3.0",
    url: "https://creativecommons.org/licenses/by/3.0/",
  },
  CC0: {
    name: "CC0",
    url: "https://creativecommons.org/publicdomain/zero/1.0/",
  },
};

export function Acknowledgements() {
  const iconAuthors = {
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
  return (
    <>
      <h3>Icons</h3>
      {/* required by the CC-BY license */}
      Some of the icons we use come from{" "}
      <a href="https://game-icons.net/" target="_blank" rel="noreferrer">
        https://game-icons.net/
      </a>
      , created by the following authors:
      <ul>
        {Object.entries(iconAuthors).map(([name, { license, url }]) => (
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
      <h3>Sounds</h3>
      <ul>
        <li>
          Click.wav from{" "}
          <a
            href="https://freesound.org/s/256116/"
            target="_blank"
            rel="noreferrer"
          >
            https://freesound.org/s/256116/
          </a>{" "}
          by kwahmah_02 <License license={licenses.CC0} />
        </li>
        <li>
          up3.mp3 from{" "}
          <a
            href="https://freesound.org/s/545373/"
            target="_blank"
            rel="noreferrer"
          >
            https://freesound.org/s/545373/
          </a>{" "}
          by stwime <License license={licenses.CC0} />
        </li>
      </ul>
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
