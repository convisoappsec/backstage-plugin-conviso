class InMemoryStore {
  private autoImportSettings = new Map<string, boolean>();
  private instanceCompanyIds = new Map<string, number>();

  getAutoImportSetting(instanceId: string): boolean | undefined {
    return this.autoImportSettings.get(instanceId);
  }

  setAutoImportSetting(instanceId: string, enabled: boolean): void {
    this.autoImportSettings.set(instanceId, enabled);
  }

  getCompanyId(instanceId: string): number | undefined {
    return this.instanceCompanyIds.get(instanceId);
  }

  setCompanyId(instanceId: string, companyId: number): void {
    this.instanceCompanyIds.set(instanceId, companyId);
  }

  getAllAutoImportSettings(): Array<[string, boolean]> {
    return Array.from(this.autoImportSettings.entries());
  }

  getEnabledInstances(): Array<{ instanceId: string; companyId: number }> {
    return Array.from(this.autoImportSettings.entries())
      .filter(([_, enabled]) => enabled)
      .map(([instanceId]) => ({
        instanceId,
        companyId: this.instanceCompanyIds.get(instanceId)!
      }))
      .filter(inst => inst.companyId !== undefined);
  }
}

export const inMemoryStore = new InMemoryStore();

