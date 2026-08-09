import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config.js";

const DATABASE_NAME = "semaforos-db";
const DATABASE_VERSION = 1;
const STORE_NAME = "traffic-lights";
const SUPABASE_PLACEHOLDER = "pega-aqui";

const cloudConfig = {
  url: String(SUPABASE_URL ?? "").trim(),
  anonKey: String(SUPABASE_ANON_KEY ?? "").trim(),
};

let databasePromise;
let supabasePromise;

export function isCloudEnabled() {
  return Boolean(
    cloudConfig.url &&
    cloudConfig.anonKey &&
    !cloudConfig.url.includes(SUPABASE_PLACEHOLDER) &&
    !cloudConfig.anonKey.includes(SUPABASE_PLACEHOLDER)
  );
}

async function getSupabase() {
  if (!isCloudEnabled()) return null;

  if (!supabasePromise) {
    supabasePromise = import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm")
      .then(({ createClient }) => createClient(cloudConfig.url, cloudConfig.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
        realtime: {
          params: { eventsPerSecond: 8 },
        },
      }));
  }

  return supabasePromise;
}

function openDatabase() {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt");
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("La base de datos está bloqueada por otra ventana."));
    });
  }

  return databasePromise;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getStore(mode) {
  const database = await openDatabase();
  return database.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
}

export async function getAllLights() {
  const supabase = await getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("traffic_lights")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data.map(fromCloudRecord);
  }

  const store = await getStore("readonly");
  const records = await requestToPromise(store.getAll());
  return records.sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveLight(light) {
  const supabase = await getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("traffic_lights")
      .upsert(toCloudRecord(light), { onConflict: "id" })
      .select()
      .single();

    if (error) throw error;
    return fromCloudRecord(data);
  }

  const store = await getStore("readwrite");
  await requestToPromise(store.put(light));
  return light;
}

export async function removeLight(id) {
  const supabase = await getSupabase();
  if (supabase) {
    const { error } = await supabase.from("traffic_lights").delete().eq("id", id);
    if (error) throw error;
    return;
  }

  const store = await getStore("readwrite");
  await requestToPromise(store.delete(id));
}

export async function getAdminUser() {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}

export async function signInAdmin(email, password) {
  const supabase = await getSupabase();
  if (!supabase) throw new Error("Supabase no está configurado.");

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signOutAdmin() {
  const supabase = await getSupabase();
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function subscribeToCloudChanges(onChange) {
  const supabase = await getSupabase();
  if (!supabase) return () => {};

  const channel = supabase
    .channel("public-traffic-lights")
    .on("postgres_changes", { event: "*", schema: "public", table: "traffic_lights" }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function onAdminStateChange(onChange) {
  const supabase = await getSupabase();
  if (!supabase) return () => {};

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    onChange(session?.user ?? null);
  });

  return () => data.subscription.unsubscribe();
}

function fromCloudRecord(record) {
  return {
    id: record.id,
    name: record.name,
    lat: Number(record.lat),
    lng: Number(record.lng),
    durations: {
      green: Number(record.green_seconds),
      amber: Number(record.amber_seconds),
      red: Number(record.red_seconds),
    },
    startedAt: Date.parse(record.started_at),
    createdAt: Date.parse(record.created_at),
    updatedAt: Date.parse(record.updated_at),
  };
}

function toCloudRecord(light) {
  return {
    id: light.id,
    name: light.name,
    lat: light.lat,
    lng: light.lng,
    green_seconds: light.durations.green,
    amber_seconds: light.durations.amber,
    red_seconds: light.durations.red,
    started_at: new Date(light.startedAt).toISOString(),
    created_at: new Date(light.createdAt).toISOString(),
    updated_at: new Date(light.updatedAt).toISOString(),
  };
}
