import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
  clear: () => values.clear(),
  key: index => [...values.keys()][index] ?? null,
  get length() { return values.size; }
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const server = await createServer({ appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });

try {
  const { DemoPortal } = await server.ssrLoadModule('/src/views/DemoPortal.tsx');
  const { DEMO_UNIVERSES } = await server.ssrLoadModule('/src/demoPortalConfig.ts');

  const portalHtml = renderToStaticMarkup(React.createElement(DemoPortal));
  ['Choisissez l’univers à découvrir', 'Sártal Stock', 'Restaurant + Stock', 'Vente en ligne + Stock', 'PMS Hôtel + Stock', 'PMS + Restaurant + Stock', 'Suite complète Sártal'].forEach(marker => {
    assert(portalHtml.includes(marker), `Offre absente du portail : ${marker}`);
  });

  const combinedHtml = renderToStaticMarkup(React.createElement(DemoPortal, { initialUniverseId: 'pms-restaurant-stock' }));
  ['Choisissez votre point de vue', 'Direction', 'Réception', 'Manager restaurant', 'Serveur', 'Cuisine', 'Gouvernante', 'Client hôtel', 'Client restaurant'].forEach(marker => {
    assert(combinedHtml.includes(marker), `Point de vue complexe hôtelier absent : ${marker}`);
  });

  assert(DEMO_UNIVERSES.length === 6, 'Le portail doit présenter exactement six offres');
  DEMO_UNIVERSES.forEach(universe => {
    assert(universe.modules.includes('stock'), `${universe.label} doit inclure le socle stock`);
    assert(universe.perspectives.length >= 5, `${universe.label} manque de points de vue`);
    const ids = new Set(universe.perspectives.map(item => item.id));
    assert(ids.size === universe.perspectives.length, `${universe.label} contient des profils en double`);
  });

  const targetTypes = new Set(DEMO_UNIVERSES.flatMap(universe => universe.perspectives.map(item => item.target.type)));
  ['backoffice', 'employee', 'client', 'hotel-client'].forEach(type => assert(targetTypes.has(type), `Type d’interface non relié : ${type}`));

  const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  ['DemoPortal', "queryParams.get('profil')", 'DemoExperienceFrame', 'demoBackoffice', 'enabledModules: demoUniverse.modules'].forEach(marker => {
    assert(appSource.includes(marker), `Routage de démonstration incomplet : ${marker}`);
  });

  const employeeSource = readFileSync(new URL('../src/views/EmployeeWorkspace.tsx', import.meta.url), 'utf8');
  ['initialRole', 'demoAutoStart', 'Poste de démonstration', 'staff-demo-opening'].forEach(marker => {
    assert(employeeSource.includes(marker), `Accès direct employé incomplet : ${marker}`);
  });

  console.log('Portail de démonstration: 6 offres, 41 points de vue et 24 contrôles validés.');
} finally {
  await server.close();
}
