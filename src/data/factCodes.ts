import { FactCode } from '../types/factCode';

export const factCodes: FactCode[] = [
  {
    code: 'R397ea',
    description: 'Parkeren op een parkeergelegen, terwijl blijkens de aanduiding op het bord of op het onderbord, dat voertuig staat geparkeerd met een ander doel dan de aangegeven wijze.',
    template: `Ik, verbalisant, zag op bovengenoemde plaats, datum en tijdstip te Amsterdam het genoemde voertuig geparkeerd met 4 wielen anders dan de wijze aangegeven door bord ……. RVV 1990. Ik zag dat het bord duidelijk voor verkeer was geplaatst ter hoogte van {locatie}. 

Ik zag namelijk {beschrijving van de bedoeling van het bord} en {beschrijving van wat in strijd was van het geparkeerd voertuig tegen het bord}. 

Ik zag dat de tekst van het onderbord luidde "{onderbordtekst}" ik zag dat het voertuig in strijd was met het bord, ik zag namelijk {beschrijving van wat er in strijd was}. 

Ik zag geen geldige ontheffing. Ik zag geen activiteiten in of rondom het voertuig gedurende 10 minuten. Ik constateerde een overtreding van sub d RVV 1990. Ik heb de betrokkene staande gehouden inzake feitcode R397ea / kon de betrokkene niet staande houden vanwege {reden}.`,
    field_options: {
      'locatie': { type: 'text' },
      'beschrijving van de bedoeling van het bord': { type: 'text' },
      'beschrijving van wat in strijd was van het geparkeerd voertuig tegen het bord': { type: 'text' },
      'onderbordtekst': { type: 'text' },
      'beschrijving van wat er in strijd was': { type: 'text' },
      'reden': { type: 'text' }
    }
  },
  {
    code: 'R311',
    description: 'Als bromfietser bij ontbreken fiets/bromfietspad niet de rijbaan gebruiken',
    template: `Ik, verbalisant, zag op bovengenoemde plaats, datum en tijdstip te Amsterdam bovengenoemde bromfietser gebruik maken van het fietspad aangegeven door bord G11 RVV 1990. Ik zag dat de bromfietser niet de rijbaan gebruikte.

Ik zag dat het bord aan het begin van het pad in beide richtingen zichtbaar voor verkeer was aangegeven ter hoogte van {locatie}. Ik zag dat bovengenoemd voertuig komende vanaf de {straatnaam} rijdende op de {wegdeel} en gaande in de richting van {richting}.

Ik zag het genoemde voertuig circa {afstand} de genoemde weg gebruiken in plaats van de rijbaan. Ik, verbalisant, zag geen geldige ontheffing op de bromfiets. Ik constateerde een overtreding van 6 lid 1 RVV 1990.

Ik, verbalisant, heb de betrokkene staande gehouden inzake feitcode R311 / kon de betrokkene niet staande houden vanwege {reden}.`,
    field_options: {
      'locatie': { type: 'text' },
      'straatnaam': { type: 'text' },
      'wegdeel': { type: 'text' },
      'richting': { type: 'text' },
      'afstand': { type: 'text' },
      'reden': { type: 'text' }
    }
  },
  {
    code: 'M001',
    description: 'Mobiele telefoon vasthouden tijdens het besturen van een voertuig',
    template: `Ik, verbalisant, zag op bovengenoemde plaats, datum en tijdstip te Amsterdam bovengenoemde betrokkene het bovengenoemde voertuig besturen terwijl betrokkene in {zijn/haar} {linker-/rechterhand} een mobiele telefoon vasthield. 

Ik zag dat de betrokkene de mobiele telefoon vasthield ter hoogte van {locatie van het vasthouden}. Het merk en type van de telefoon was {merk en model van telefoon}. Ik zag dat de betrokkene circa {aantal meters gereden} meter reed terwijl betrokkene een mobiele telefoon vasthield. 

Ik, verbalisant, zag dat bovengenoemd voertuig komende vanaf de {komende vanaf}, rijdende op de {rijdende op} en gaande in de richting van {richting van}. Ik, verbalisant, zag geen geldige ontheffing op of in het voertuig.`,
    field_options: {
      'zijn/haar': { 
        type: 'checkbox', 
        options: ['zijn', 'haar'] 
      },
      'linker-/rechterhand': { 
        type: 'checkbox', 
        options: ['linkerhand', 'rechterhand'] 
      },
      'locatie van het vasthouden': { type: 'text' },
      'merk en model van telefoon': { type: 'text' },
      'aantal meters gereden': { type: 'text' },
      'komende vanaf': { type: 'text' },
      'rijdende op': { type: 'text' },
      'richting van': { type: 'text' }
    }
  }
];