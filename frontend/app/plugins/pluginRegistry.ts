import React, { useState, useEffect } from "react";

export interface PluginDefinition {
  id: string;
  domain: string; // e.g. 'practice' | 'learning' | 'language' | 'community' | 'progress' | 'ai-tools'
  label: string | Record<string, string>; // Multi-lingual string or plain text
  icon: React.ElementType;
  component: React.ComponentType<any>;
  requiredSubscription?: "free" | "premium" | "pro";
  badge?: string;
  order?: number;
  description?: string;
  enabled?: boolean;
}

type Listener = () => void;

class PluginRegistry {
  private plugins: Map<string, PluginDefinition> = new Map();
  private listeners: Set<Listener> = new Set();

  public register(plugin: PluginDefinition): void {
    this.plugins.set(plugin.id, { ...plugin, enabled: plugin.enabled ?? true });
    this.notify();
  }

  public unregister(pluginId: string): void {
    if (this.plugins.delete(pluginId)) {
      this.notify();
    }
  }

  public get(pluginId: string): PluginDefinition | undefined {
    return this.plugins.get(pluginId);
  }

  public getAll(): PluginDefinition[] {
    return Array.from(this.plugins.values()).filter((p) => p.enabled !== false);
  }

  public getForDomain(domain: string): PluginDefinition[] {
    return this.getAll()
      .filter((p) => p.domain === domain)
      .sort((a, b) => (a.order || 99) - (b.order || 99));
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error("Plugin listener error", e);
      }
    });
  }
}

export const pluginRegistry = new PluginRegistry();

export function registerPlugin(plugin: PluginDefinition): void {
  pluginRegistry.register(plugin);
}

export function unregisterPlugin(pluginId: string): void {
  pluginRegistry.unregister(pluginId);
}

export function getPluginsForDomain(domain: string): PluginDefinition[] {
  return pluginRegistry.getForDomain(domain);
}

export function getAllPlugins(): PluginDefinition[] {
  return pluginRegistry.getAll();
}

/**
 * React hook to reactively subscribe to plugins for a specific domain
 */
export function useDomainPlugins(domain: string): PluginDefinition[] {
  const [plugins, setPlugins] = useState<PluginDefinition[]>(() =>
    pluginRegistry.getForDomain(domain)
  );

  useEffect(() => {
    // Sync initially in case plugins were added before mount
    setPlugins(pluginRegistry.getForDomain(domain));

    const unsubscribe = pluginRegistry.subscribe(() => {
      setPlugins(pluginRegistry.getForDomain(domain));
    });

    return unsubscribe;
  }, [domain]);

  return plugins;
}
