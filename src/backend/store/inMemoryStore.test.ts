import { inMemoryStore } from './inMemoryStore';

describe('InMemoryStore', () => {
  beforeEach(() => {
    const store = inMemoryStore as any;
    store.autoImportSettings.clear();
    store.instanceCompanyIds.clear();
  });

  describe('autoImportSettings', () => {
    it('should set and get auto import setting', () => {
      inMemoryStore.setAutoImportSetting('instance-1', true);
      expect(inMemoryStore.getAutoImportSetting('instance-1')).toBe(true);
    });

    it('should return undefined for non-existent setting', () => {
      expect(inMemoryStore.getAutoImportSetting('non-existent')).toBeUndefined();
    });

    it('should update existing setting', () => {
      inMemoryStore.setAutoImportSetting('instance-1', false);
      inMemoryStore.setAutoImportSetting('instance-1', true);
      expect(inMemoryStore.getAutoImportSetting('instance-1')).toBe(true);
    });

    it('should get all auto import settings', () => {
      inMemoryStore.setAutoImportSetting('instance-1', true);
      inMemoryStore.setAutoImportSetting('instance-2', false);
      inMemoryStore.setAutoImportSetting('instance-3', true);

      const allSettings = inMemoryStore.getAllAutoImportSettings();
      expect(allSettings).toHaveLength(3);
      expect(allSettings).toContainEqual(['instance-1', true]);
      expect(allSettings).toContainEqual(['instance-2', false]);
      expect(allSettings).toContainEqual(['instance-3', true]);
    });
  });

  describe('companyIds', () => {
    it('should set and get company ID', () => {
      inMemoryStore.setCompanyId('instance-1', 123);
      expect(inMemoryStore.getCompanyId('instance-1')).toBe(123);
    });

    it('should return undefined for non-existent company ID', () => {
      expect(inMemoryStore.getCompanyId('non-existent')).toBeUndefined();
    });

    it('should update existing company ID', () => {
      inMemoryStore.setCompanyId('instance-1', 123);
      inMemoryStore.setCompanyId('instance-1', 456);
      expect(inMemoryStore.getCompanyId('instance-1')).toBe(456);
    });
  });

  describe('getEnabledInstances', () => {
    it('should return only enabled instances with company IDs', () => {
      inMemoryStore.setAutoImportSetting('instance-1', true);
      inMemoryStore.setCompanyId('instance-1', 123);
      inMemoryStore.setAutoImportSetting('instance-2', false);
      inMemoryStore.setCompanyId('instance-2', 456);
      inMemoryStore.setAutoImportSetting('instance-3', true);
      inMemoryStore.setCompanyId('instance-3', 789);

      const enabled = inMemoryStore.getEnabledInstances();
      expect(enabled).toHaveLength(2);
      expect(enabled).toContainEqual({ instanceId: 'instance-1', companyId: 123 });
      expect(enabled).toContainEqual({ instanceId: 'instance-3', companyId: 789 });
      expect(enabled).not.toContainEqual({ instanceId: 'instance-2', companyId: 456 });
    });

    it('should exclude enabled instances without company IDs', () => {
      inMemoryStore.setAutoImportSetting('instance-1', true);
      inMemoryStore.setAutoImportSetting('instance-2', true);
      inMemoryStore.setCompanyId('instance-2', 456);

      const enabled = inMemoryStore.getEnabledInstances();
      expect(enabled).toHaveLength(1);
      expect(enabled).toContainEqual({ instanceId: 'instance-2', companyId: 456 });
    });

    it('should return empty array when no instances are enabled', () => {
      inMemoryStore.setAutoImportSetting('instance-1', false);
      inMemoryStore.setCompanyId('instance-1', 123);

      expect(inMemoryStore.getEnabledInstances()).toHaveLength(0);
    });
  });
});

