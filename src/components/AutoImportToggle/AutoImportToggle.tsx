import { InfoCard } from '@backstage/core-components';
import { FormControlLabel, Switch, Typography } from '@material-ui/core';

interface AutoImportToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function AutoImportToggle({ enabled, onChange }: AutoImportToggleProps) {
  return (
    <InfoCard 
      title="Automatic Import"
      className="conviso-info-card"
    >
      <div style={{ padding: '16px 24px' }}>
        <FormControlLabel
          control={
            <Switch
              checked={enabled}
              onChange={(e) => onChange(e.target.checked)}
              className="conviso-switch"
              style={{ 
                color: enabled ? '#FFB800' : undefined 
              }}
            />
          }
          label={
            <Typography variant="body1" style={{ fontWeight: 600, color: '#0a2540', fontSize: '16px' }}>
              {enabled ? 'Enabled' : 'Disabled'}
            </Typography>
          }
        />
        <Typography variant="body2" display="block" style={{ marginTop: 16, color: '#666666', lineHeight: 1.7 }}>
          When enabled, new components created in Backstage will be automatically imported to Conviso Platform as security assets. The import process runs in the background and does not require you to be on this page.
          {enabled && (
            <div style={{ 
              marginTop: 16, 
              padding: 14, 
              background: 'rgba(255, 184, 0, 0.12)', 
              borderLeft: '4px solid #FFB800',
              borderRadius: '6px',
              border: '1px solid rgba(255, 184, 0, 0.3)'
            }}>
              <strong style={{ color: '#0a2540', display: 'block', fontSize: '14px' }}>
                Manual import is disabled while automatic import is active.
              </strong>
            </div>
          )}
        </Typography>
      </div>
    </InfoCard>
  );
}

