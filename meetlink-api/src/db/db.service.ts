import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResult, QueryResultRow } from 'pg';

@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(config: ConfigService) {
    const connectionString = config.get<string>('DATABASE_URL');
    const databasePassword = config.get<string>('DATABASE_PASSWORD');

    if (!connectionString) {
      throw new Error('DATABASE_URL is missing. Copy .env.example to .env and set your Supabase password.');
    }

    const normalizedUrl = new URL(connectionString);
    const isSupabase = normalizedUrl.hostname.includes('supabase.');

    if (databasePassword) {
      normalizedUrl.password = databasePassword;
    }

    if (isSupabase) {
      normalizedUrl.searchParams.delete('sslmode');
    }

    this.pool = new Pool({
      connectionString: normalizedUrl.toString(),
      ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
    });
  }

  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
