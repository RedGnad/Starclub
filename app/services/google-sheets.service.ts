/**
 * Service pour récupérer les données depuis Google Sheets (Monad Ecosystem)
 */

import axios from 'axios';
import Papa from 'papaparse';

export interface GoogleSheetsProtocol {
  name: string;
  logo?: string;
  projectType?: string; // 'App', 'Infra', 'App/Infra'
  tags?: string[]; // ['DeFi', 'DEX', 'Gaming', etc.]
  twitter?: string;
  website?: string;
  banner?: string;
  description?: string;
  monadOnly?: boolean;
  suspicious?: boolean;
}

export class GoogleSheetsService {
  private readonly SHEET_ID = '1LvM26stpFO7kJk4Y974NhLznjerMh6h8wvZBeYja26M';
  private readonly GID = '0';

  /**
   * Récupérer toutes les données depuis Google Sheets
   */
  async fetchProtocols(): Promise<GoogleSheetsProtocol[]> {
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${this.SHEET_ID}/export?format=csv&gid=${this.GID}`;

      console.log('📥 Récupération des données Google Sheets...');
      const response = await axios.get(csvUrl, {
        timeout: 10000,
        maxRedirects: 5,
      });

      // Parser le CSV
      const parsed = Papa.parse<string[]>(response.data, {
        header: false,
        skipEmptyLines: true,
      });

      if (parsed.errors.length > 0) {
        console.error('⚠️ Erreurs lors du parsing CSV:', parsed.errors);
      }

      const rows = parsed.data;
      if (rows.length === 0) {
        console.log('⚠️ Aucune donnée trouvée dans le Google Sheet');
        return [];
      }

      // La première ligne contient les en-têtes
      const headers = rows[0];
      const dataRows = rows.slice(1);

      console.log(`📊 ${dataRows.length} projets trouvés dans Google Sheets`);

      // Mapper les colonnes (basé sur l'ordre du CSV)
      const protocols: GoogleSheetsProtocol[] = dataRows.map(row => {
        const name = row[0]?.trim() || '';
        const logo = row[1]?.trim() || undefined;
        const projectType = row[2]?.trim() || undefined;
        const tagsRaw = row[3]?.trim() || '';
        const twitter = row[4]?.trim() || undefined;
        const website = row[5]?.trim() || undefined;
        const banner = row[6]?.trim() || undefined;
        const description = row[7]?.trim() || undefined;
        const monadOnly = row[8]?.trim().toLowerCase() === 'yes';
        const suspicious = row[9]?.trim().toLowerCase().includes('sus') ||
                          row[9]?.trim().toLowerCase().includes('dead') ||
                          row[9]?.trim().toLowerCase().includes('broken');

        // Parser les tags (séparés par virgules)
        const tags = tagsRaw
          ? tagsRaw.split(',').map(t => t.trim()).filter(t => t.length > 0)
          : [];

        return {
          name,
          logo,
          projectType,
          tags,
          twitter,
          website,
          banner,
          description,
          monadOnly,
          suspicious,
        };
      }).filter(p => p.name.length > 0); // Filtrer les lignes vides

      console.log(`✓ ${protocols.length} protocoles valides parsés`);

      return protocols;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération Google Sheets:', error);
      return [];
    }
  }

  /**
   * Trouver un protocole par nom (recherche insensible à la casse)
   */
  findByName(protocols: GoogleSheetsProtocol[], name: string): GoogleSheetsProtocol | undefined {
    const nameLower = name.toLowerCase().trim();

    // Recherche exacte
    let found = protocols.find(p => p.name.toLowerCase() === nameLower);
    if (found) return found;

    // Recherche partielle (contient)
    found = protocols.find(p =>
      p.name.toLowerCase().includes(nameLower) ||
      nameLower.includes(p.name.toLowerCase())
    );
    if (found) return found;

    // Recherche fuzzy (sans espaces, tirets, etc.)
    const normalize = (s: string) => s.toLowerCase().replace(/[\s\-_]/g, '');
    const normalizedSearch = normalize(nameLower);

    found = protocols.find(p => {
      const normalizedName = normalize(p.name);
      return normalizedName === normalizedSearch ||
             normalizedName.includes(normalizedSearch) ||
             normalizedSearch.includes(normalizedName);
    });

    return found;
  }
}

export const googleSheetsService = new GoogleSheetsService();
