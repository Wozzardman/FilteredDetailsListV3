/** @jest-environment node */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const { parseStringPromise } = require('xml2js');

describe('PCF import manifest bindings', () => {
    it('keeps property and dataset binding names unique across the whole control', async () => {
        const document = await parseStringPromise(readFileSync(resolve(__dirname, '../ControlManifest.Input.xml'), 'utf8'));
        const control = document.manifest.control[0];
        const owners = new Map<string, string[]>();
        const add = (node: any, owner: string) => {
            const name = node.$.name;
            owners.set(name, [...(owners.get(name) || []), owner]);
        };
        (control.property || []).forEach((property: any) => add(property, 'control'));
        (control['data-set'] || []).forEach((dataset: any) => {
            add(dataset, 'control');
            (dataset['property-set'] || []).forEach((property: any) => add(property, dataset.$.name));
        });
        expect(Object.fromEntries([...owners].filter(([, locations]) => locations.length > 1))).toEqual({});
    });
});
