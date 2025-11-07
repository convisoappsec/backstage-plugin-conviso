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
      <div>
        <FormControlLabel
          control={
            <Switch
              checked={enabled}
              onChange={(e) => onChange(e.target.checked)}
              className="conviso-switch"
            />
          }
          label={
            <Typography variant="body1">
              {enabled ? 'Enabled' : 'Disabled'}
            </Typography>
          }
        />
        <Typography variant="body2" component="div">
          When enabled, new components created in Backstage will be automatically imported to Conviso Platform as security assets. The import process runs in the background and does not require you to be on this page.
          {enabled && (
            <div>
              <strong>
                Manual import is disabled while automatic import is active.
              </strong>
            </div>
          )}
        </Typography>
      </div>
    </InfoCard>
  );
}

