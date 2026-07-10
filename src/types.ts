export interface OdaiTag {
  name: string;
  display_name: string;
  type: string;
  state: string;
  open_at: string | null;
  close_at: string | null;
  synced_at: string;
}

export interface UserTag {
  id: string;
  raw: string;
  normalized: string;
  isOdai: boolean;
  odaiInfo?: OdaiTag;
}
