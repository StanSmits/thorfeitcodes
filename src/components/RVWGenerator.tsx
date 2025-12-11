import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Copy, Check, HelpCircle, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { deepEqual } from "@/lib/utils";

interface RVWGeneratorProps {
  factcode: any;
  onBack: () => void;
  initialFormValues?: Record<string, string>;
}

export function RVWGenerator({
  factcode,
  onBack,
  initialFormValues,
}: RVWGeneratorProps) {
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [isStopped, setIsStopped] = useState<boolean>(false);
  const [notStoppedReason, setNotStoppedReason] = useState<
    "geen_bestuurder" | "stopteken" | "anders"
  >("geen_bestuurder");
  const [andersText, setAndersText] = useState<string>("");
  const previewTimeout = useRef<number | null>(null);
  // Map keyed by lowercased sign_code -> sign record
  const [signsMap, setSignsMap] = useState<Record<string, any>>({});
  // Hover preview state (positioned near cursor)
  const [preview, setPreview] = useState<null | {
    name: string;
    image_url?: string;
    x: number;
    y: number;
  }>(null);
  // Recent RvWs: top 3 and full list (deduped by location)
  const [recentRvwsTop, setRecentRvwsTop] = useState<any[]>([]);
  const [recentRvwsAll, setRecentRvwsAll] = useState<any[]>([]);

  const currentPrefill = useMemo(() => {
    return initialFormValues ?? formValues;
  }, [initialFormValues, formValues]);

  useEffect(() => {
    // Increment access count
    const incrementCount = async () => {
      await supabase.rpc("increment_access_count", {
        item_id: factcode.factcode,
      });
    };
    incrementCount();
  }, [factcode.factcode]);

  // Fetch sign records that match option labels.
  // We try to avoid unnecessary requests: fetch once using .in for exact matches,
  // and only run a second (small) ilike OR query for any unmatched labels to cover capitalization differences.
  useEffect(() => {
    const fieldOptions = factcode.field_options || {};
    const names = new Set<string>();

    const collect = (opts: any) => {
      if (!opts) return;
      if (Array.isArray(opts)) {
        opts.forEach((o: any) => {
          if (o && typeof o === "object" && "label" in o)
            names.add(String(o.label).trim());
          else if (typeof o === "string") names.add(String(o).trim());
        });
      } else if (typeof opts === "object" && opts.type === "radio") {
        (opts.options || []).forEach((o: any) => {
          if (o && typeof o === "object" && "label" in o)
            names.add(String(o.label).trim());
          else if (typeof o === "string") names.add(String(o).trim());
        });
      }
    };

    Object.values(fieldOptions).forEach(collect);
    const toFetch = Array.from(names).filter(Boolean);
    if (toFetch.length === 0) return;

    const fetchSigns = async () => {
      try {
        // First try exact matches (minimal and fast) matching on sign_code
        const { data: exactData, error: exactError } = await (supabase as any)
          .from("road_signs")
          .select("sign_code, sign_name, description, image_url")
          .in("sign_code", toFetch);

        if (exactError) {
          console.error("Failed to fetch exact sign matches", exactError);
          return;
        }

        const map: Record<string, any> = {};
        const matchedLower = new Set<string>();
        (exactData || []).forEach((s: any) => {
          if (s?.sign_code) {
            const key = String(s.sign_code).trim().toLowerCase();
            map[key] = s;
            matchedLower.add(key);
          }
        });

        // Determine missing labels (case-insensitive)
        const missing = toFetch.filter(
          (t) => !matchedLower.has(String(t).trim().toLowerCase())
        );

        if (missing.length > 0) {
          // Build OR ilike query for the missing labels to capture case-insensitive matches
          // Use exact ilike on the whole string to avoid partial matches
          const orParts = missing.map(
            (m) => `sign_code.ilike.'${String(m).replace(/'/g, "''")}'`
          );
          const orQuery = orParts.join(",");
          const { data: ilikeData, error: ilikeError } = await (supabase as any)
            .from("road_signs")
            .select("sign_code, sign_name, description, image_url")
            .or(orQuery);

          if (ilikeError) {
            console.error("Failed to fetch ilike sign matches", ilikeError);
          } else {
            (ilikeData || []).forEach((s: any) => {
              if (s?.sign_code) {
                const key = String(s.sign_code).trim().toLowerCase();
                map[key] = s;
              }
            });
          }
        }

        setSignsMap(map);
      } catch (err) {
        console.error("Error fetching signs", err);
      }
    };

    fetchSigns();
    // We only want to re-run when the field options object identity changes
  }, [factcode.field_options]);

  // Fetch recent RvWs when component loads or location value changes
  useEffect(() => {
    const locationField = factcode.location_field;
    if (!locationField) {
      setRecentRvws([]);
      return;
    }

    const fetchRecentRvws = async () => {
      try {
        // Fetch all recent RvWs for this factcode, grouped by location
        const { data, error } = await supabase
          .from("saved_rvws")
          .select("*")
          .eq("factcode", factcode.factcode)
          .order("created_at", { ascending: false })
          .limit(100); // more entries to find older suggestions

        if (error) {
          console.error("Failed to fetch recent RvWs", error);
          return;
        }

        // Group by location and keep only the 3 most recent unique locations
        const locationMap = new Map<string, any>();
        (data || []).forEach((rvw: any) => {
          const key = String(rvw.location_value || "").trim();
          if (!key) return;
          if (!locationMap.has(key)) {
            locationMap.set(key, rvw);
          }
        });

        const deduped = Array.from(locationMap.values());
        setRecentRvwsTop(deduped.slice(0, 3));
        setRecentRvwsAll(deduped);
      } catch (err) {
        console.error("Error fetching recent RvWs", err);
      }
    };

    fetchRecentRvws();
  }, [factcode.factcode, factcode.location_field]);

  const fieldOptions = useMemo(() => factcode.field_options || {}, [factcode.field_options]);
  const fieldTooltips = useMemo(() => factcode.field_tooltips || {}, [factcode.field_tooltips]);
  const conditionalRules = useMemo(() => factcode.conditional_rules || {}, [factcode.conditional_rules]);

  // Check if a field is visible based on conditional rules
  const isFieldVisible = useCallback((fieldName: string): boolean => {
    const rule = conditionalRules[fieldName];
    if (!rule) return true; // No rule means always visible

    const { dependsOn, showWhen } = rule;
    if (!dependsOn || !showWhen) return true;

    const dependsOnValue = formValues[dependsOn] || "";
    const { operator, value } = showWhen;

    switch (operator) {
      case "equals":
        return dependsOnValue === value;
      case "notEquals":
        return dependsOnValue !== value;
      case "contains":
        return dependsOnValue.includes(value);
      case "notContains":
        return !dependsOnValue.includes(value);
      case "isEmpty":
        return dependsOnValue.trim() === "";
      case "isNotEmpty":
        return dependsOnValue.trim() !== "";
      default:
        return true;
    }
  }, [conditionalRules, formValues]);

  // Get all visible fields
  const visibleFields = useMemo(() => {
    return Object.keys(fieldOptions).filter((field) => isFieldVisible(field));
  }, [fieldOptions, isFieldVisible]);

  // Extract field names from template in order of appearance
  const orderedFields = useMemo(() => {
    const template = factcode.template || "";
    const matches = template.match(/\{([^}]+)\}/g);
    if (!matches) return [];

    const seen = new Set<string>();
    return matches
      .map((match) => match.slice(1, -1))
      .filter((field) => {
        if (seen.has(field)) return false;
        seen.add(field);
        return true;
      });
  }, [factcode.template]);

  // Get visible ordered fields (for form rendering)
  const visibleOrderedFields = useMemo(() => {
    return orderedFields.filter((field) => isFieldVisible(field));
  }, [orderedFields, isFieldVisible]);

  // Auto-generate text as form values change, handling hidden fields
  const generatedText = useMemo(() => {
    let result = factcode.template || "";

    // First, process all visible fields
    Object.entries(formValues).forEach(([key, value]) => {
      if (isFieldVisible(key)) {
        const placeholder = `{${key}}`;
        result = result.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          value
        );
      }
    });

    // For hidden fields, we need to remove the related text sections
    // Find sentences/phrases containing hidden field placeholders and remove them
    orderedFields.forEach((fieldName) => {
      if (!isFieldVisible(fieldName)) {
        const placeholder = `{${fieldName}}`;
        const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        
        // Remove the placeholder along with its surrounding sentence structure
        // Pattern 1: Remove whole sentence ending with the placeholder
        result = result.replace(
          new RegExp(`[^.]*${escapedPlaceholder}[^.]*\\.?\\s*`, "g"),
          ""
        );
      }
    });

    // Clean up extra whitespace and empty lines
    result = result.replace(/\n\s*\n\s*\n/g, "\n\n").trim();

    return result;
  }, [formValues, factcode.template, orderedFields, isFieldVisible]);

  const reasonPrefix = useMemo(() => {
    if (isStopped) {
      return `Ik heb de persoon staande gehouden inzake ${factcode.factcode}`;
    }

    // not stopped
    if (notStoppedReason === "geen_bestuurder") {
      return "Ik kon de betrokkene niet staande houden omdat er gedurende de gehele casus geen activiteiten in of om het voertuig heb waargenomen.  Daarnaast kwam er gedurende de gehele casus geen betrokkene bij mij zich melden alszijnde bestuurder";
    }

    if (notStoppedReason === "stopteken") {
      return "Ik kon de betrokkene niet staande houden omdat er geen tijdig stopteken gegeven kon worden aan de bestuurder.";
    }

    // anders
    return `Ik kon de betrokkene niet staande houden omdat ${
      andersText === ""
        ? "{vul hier in waarom je de betrokkene niet heb staande gehouden}"
        : andersText
    }`;
  }, [isStopped, notStoppedReason, andersText, factcode.factcode]);

  const fullGeneratedText = useMemo(() => {
    const prefix = reasonPrefix ? `\n\n${reasonPrefix}` : '';
    return `${generatedText}${prefix}`;
  }, [reasonPrefix, generatedText]);

  // Update form value and auto-generate
  const updateFormValue = (fieldName: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  // If parent provides initial form values (via navigation prefill), apply them
  useEffect(() => {
    if (initialFormValues) {
      setFormValues(initialFormValues);
    }
  }, [initialFormValues]);

  const handleCopy = async () => {
    // Copy the clean version without highlighting
    const cleanText = fullGeneratedText.replace(/\{[^}]+\}/g, (match) => match);
    navigator.clipboard.writeText(cleanText);
    setCopied(true);
    toast({
      title: "Gekopieerd",
      description: "De tekst is naar het klembord gekopieerd.",
    });
    setTimeout(() => setCopied(false), 2000);

    // Save the RvW if location field is configured
    const locationField = factcode.location_field;
    if (locationField) {
      const locationValue = formValues[locationField];
      if (locationValue && locationValue.trim() !== "") {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          const userId = user?.id || null;

          // Check if this exact generated RvW already exists for this user and factcode.
          // If so, update its timestamp and form_values instead of inserting a new row.
          const { data: existing, error: existingError } = await supabase
            .from("saved_rvws")
            .select("id")
            .match({
              user_id: userId,
              factcode: factcode.factcode,
              generated_text: cleanText,
            })
            .maybeSingle();

          if (existingError) {
            console.error("Failed to query existing saved RvW", existingError);
          }

          if (existing && existing.id) {
            try {
              await supabase
                .from("saved_rvws")
                .update({
                  created_at: new Date().toISOString(),
                  form_values: formValues,
                  location_value: locationValue.trim(),
                })
                .eq("id", existing.id);
            } catch (err) {
              console.error("Failed to update existing saved RvW", err);
            }
          } else {
            await supabase.from("saved_rvws").insert({
              user_id: userId,
              factcode: factcode.factcode,
              location_value: locationValue.trim(),
              form_values: formValues,
              generated_text: cleanText,
            });
          }
        } catch (err) {
          console.error("Failed to save RvW", err);
        }
      }
    }
  };

  const loadRecentRvw = async (rvw: any) => {
    if (rvw.form_values) {
      setFormValues(rvw.form_values);

      // Update the timestamp by re-saving with current time
      try {
        await supabase
          .from("saved_rvws")
          .update({ created_at: new Date().toISOString() })
          .eq("id", rvw.id);

        // Refresh the list
        const locationField = factcode.location_field;
        if (locationField) {
          const locationValue = rvw.location_value;
          const { data } = await supabase
            .from("saved_rvws")
            .select("*")
            .eq("factcode", factcode.factcode)
            .eq("location_value", locationValue)
            .order("created_at", { ascending: false })
            .limit(3);
          setRecentRvws(data || []);
        }
      } catch (err) {
        console.error("Failed to update timestamp", err);
      }

      toast({
        title: "RvW geladen",
        description: "De opgeslagen RvW is geladen.",
      });
    }
  };

  const showPreview = (label: string, e: React.MouseEvent) => {
    const key = String(label || "")
      .trim()
      .toLowerCase();
    const sign = signsMap[key];
    if (!sign) return;
    if (previewTimeout.current) window.clearTimeout(previewTimeout.current);
    previewTimeout.current = window.setTimeout(() => {
      // Calculate a viewport-safe position for the preview card so it is always visible
      const margin = 12;
      const cardWidth = 320; // matches maxWidth used in JSX
      const cardHeight = 280; // estimated card height (image + caption + padding)

      let left = e.clientX + margin;
      let top = e.clientY + margin;

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // If the card would overflow to the right, flip it to the left of the cursor
      if (left + cardWidth + 8 > vw) {
        left = e.clientX - cardWidth - margin;
      }
      // If flipping left still puts it off-screen, clamp to the right edge
      if (left < 8) left = 8;

      // If the card would overflow the bottom, move it above the cursor
      if (top + cardHeight + 8 > vh) {
        top = e.clientY - cardHeight - margin;
      }
      // Clamp top
      if (top < 8) top = 8;

      setPreview({
        name: sign.sign_name || sign.sign_code,
        image_url: sign.image_url,
        x: left,
        y: top,
      });
    }, 120);
  };

  const hidePreview = () => {
    if (previewTimeout.current) window.clearTimeout(previewTimeout.current);
    setPreview(null);
  };

  const renderField = (fieldName: string, options: any) => {
    const label = fieldTooltips[fieldName] || fieldName;

    if (Array.isArray(options)) {
      // Check if options have label/value structure
      const hasLabelValue =
        options.length > 0 &&
        typeof options[0] === "object" &&
        "label" in options[0];

      // Dropdown
      return (
        <div key={fieldName} className="space-y-2">
          <Label htmlFor={fieldName}>{label}</Label>
          <Select
            value={formValues[fieldName] || ""}
            onValueChange={(value) => updateFormValue(fieldName, value)}
          >
            <SelectTrigger id={fieldName}>
              <SelectValue placeholder="Selecteer een optie" />
            </SelectTrigger>
            <SelectContent>
              {options.map((option: any) => {
                const optionValue = hasLabelValue ? option.value : option;
                const optionLabel = hasLabelValue ? option.label : option;
                const hasSign = Boolean(
                  signsMap[
                    String(optionLabel || "")
                      .trim()
                      .toLowerCase()
                  ]
                );
                return (
                  <SelectItem key={optionValue} value={optionValue}>
                    <div className="flex items-center justify-between w-full">
                      <span>{optionLabel}</span>
                      {hasSign && (
                        <button
                          type="button"
                          onMouseEnter={(e) =>
                            showPreview(optionLabel, e as any)
                          }
                          onMouseLeave={hidePreview}
                          className="ml-2 text-muted-foreground"
                          aria-label={`Toon info over ${optionLabel}`}
                        >
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      );
    } else if (typeof options === "object" && options.type === "radio") {
      const hasLabelValue =
        options.options?.length > 0 &&
        typeof options.options[0] === "object" &&
        "label" in options.options[0];

      // Radio buttons
      return (
        <div key={fieldName} className="space-y-3">
          <Label>{label}</Label>
          <RadioGroup
            value={formValues[fieldName] || ""}
            onValueChange={(value) => updateFormValue(fieldName, value)}
          >
            {options.options.map((option: any) => {
              const optionValue = hasLabelValue ? option.value : option;
              const optionLabel = hasLabelValue ? option.label : option;
              const hasSign = Boolean(
                signsMap[
                  String(optionLabel || "")
                    .trim()
                    .toLowerCase()
                ]
              );
              return (
                <div key={optionValue} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={optionValue}
                    id={`${fieldName}-${optionValue}`}
                  />
                  <Label
                    htmlFor={`${fieldName}-${optionValue}`}
                    className="font-normal flex items-center gap-2"
                  >
                    <span>{optionLabel}</span>
                    {hasSign && (
                      <button
                        type="button"
                        onMouseEnter={(e) => showPreview(optionLabel, e as any)}
                        onMouseLeave={hidePreview}
                        className="text-muted-foreground"
                        aria-label={`Toon info over ${optionLabel}`}
                      >
                        <HelpCircle className="h-4 w-4" />
                      </button>
                    )}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>
      );
    } else {
      // Free text input
      const isLocation = fieldName === factcode.location_field;
      const typed = String(formValues[fieldName] || "").trim();
      return (
        <div key={fieldName} className="space-y-2">
          <Label htmlFor={fieldName}>{label}</Label>
          <Input
            id={fieldName}
            value={formValues[fieldName] || ""}
            onChange={(e) => updateFormValue(fieldName, e.target.value)}
            placeholder={`Voer ${label.toLowerCase()} in`}
          />
          {isLocation && typed && locationSuggestions.length > 0 && (
            <div className="mt-2 rounded-md border bg-card">
              <ul className="max-h-56 overflow-auto py-1">
                {locationSuggestions.map((rvw) => (
                  <li key={rvw.id} className="bg-muted/25 hover:bg-muted/70 transition-colors">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                      onClick={() => {
                        updateFormValue(fieldName, rvw.location_value || "");
                        loadRecentRvw(rvw);
                      }}
                    >
                      {highlightMatch(String(rvw.location_value || ""), typed)}
                      <span className="block text-xs text-muted-foreground">
                        Laatst gebruikt: {new Date(rvw.created_at).toLocaleDateString("nl-NL")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }
  };

  // Render generated text with highlighted unfilled fields
  const renderGeneratedTextWithHighlights = () => {
    // Use the generatedText which already has hidden fields' sections removed
    const textToRender = generatedText;
    const parts: JSX.Element[] = [];
    let lastIndex = 0;
    const placeholderRegex = /\{([^}]+)\}/g;
    let match;
    let key = 0;

    while ((match = placeholderRegex.exec(textToRender)) !== null) {
      const fieldName = match[1];
      const matchStart = match.index;

      // Skip if this field is not visible (shouldn't happen as they're removed from generatedText)
      if (!isFieldVisible(fieldName)) continue;

      // Add text before placeholder
      if (matchStart > lastIndex) {
        parts.push(
          <span key={`text-${key++}`}>
            {textToRender.substring(lastIndex, matchStart)}
          </span>
        );
      }

      // Add placeholder or value with highlighting
      const value = formValues[fieldName];
      if (!value || value.trim() === "") {
        parts.push(
          <span
            key={`field-${key++}`}
            className="bg-yellow-200 dark:bg-yellow-900/50 px-1 rounded font-semibold"
            title={`Vul "${fieldTooltips[fieldName] || fieldName}" in`}
          >
            {`{${fieldName}}`}
          </span>
        );
      } else {
        parts.push(<span key={`field-${key++}`}>{value}</span>);
      }

      lastIndex = matchStart + match[0].length;
    }

    // Add remaining text
    if (lastIndex < textToRender.length) {
      parts.push(
        <span key={`text-${key++}`}>{textToRender.substring(lastIndex)}</span>
      );
    }

    return <div className="whitespace-pre-wrap">{parts}</div>;
  };

  const hasUnfilledFields = useMemo(() => {
    const missingField = visibleOrderedFields.some(
      (field) => !formValues[field] || formValues[field].trim() === ""
    );
    const missingAnders =
      !isStopped &&
      notStoppedReason === "anders" &&
      (!andersText || andersText.trim() === "");
    return missingField || missingAnders;
  }, [visibleOrderedFields, formValues, isStopped, notStoppedReason, andersText]);

  const filteredRecentRvws = useMemo(() => {
    return recentRvwsTop.filter((rvw) => {
      // Exclude if saved form_values deep-equals current prefill
      if (deepEqual(rvw.form_values, currentPrefill)) return false;
      // Also exclude if generated_text matches the current full generated text
      if (rvw.generated_text && rvw.generated_text === fullGeneratedText)
        return false;
      return true;
    });
  }, [recentRvwsTop, currentPrefill, fullGeneratedText]);

  // Suggestions for location input based on typed value, excluding top-3
  const locationSuggestions = useMemo(() => {
    const locField = factcode.location_field;
    const typed = String(formValues[locField] || "").trim().toLowerCase();
    if (!locField || !typed) return [] as any[];
    const topSet = new Set(recentRvwsTop.map((r) => String(r.location_value || "")));
    return recentRvwsAll
      .filter((rvw) => {
        const loc = String(rvw.location_value || "").toLowerCase();
        if (!loc.includes(typed)) return false;
        if (topSet.has(String(rvw.location_value || ""))) return false;
        return true;
      })
      .slice(0, 8);
  }, [factcode.location_field, formValues, recentRvwsTop, recentRvwsAll]);

  const highlightMatch = (text: string, query: string) => {
    const i = text.toLowerCase().indexOf(query.toLowerCase());
    if (i === -1) return <span>{text}</span>;
    const before = text.slice(0, i);
    const match = text.slice(i, i + query.length);
    const after = text.slice(i + query.length);
    return (
      <span>
        {before}
        <span className="font-semibold">{match}</span>
        {after}
      </span>
    );
  };

  const grondslagArtikelFormatter = (artikel: string) => {
    let formatted = artikel.trim();
    if (formatted.toLowerCase().startsWith("artikel")) {
      formatted = formatted.replace(/^[Aa]rtikel/, "Art.");
    } else {
      formatted = `Art. ${formatted}`;
    }
    formatted = formatted.replace(/,/g, ";");
    return formatted;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Optional road sign image set on the feitcode (from Admin) */}
        {factcode.image_url ? (
          <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-muted">
            <img
              src={factcode.image_url}
              alt={factcode.tooltip_text || factcode.factcode}
              title={factcode.tooltip_text || ''}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        ) : null}

        <div>
          <h2 className="text-2xl font-bold">{factcode.factcode}</h2>
          <p className="text-muted-foreground">{factcode.description}</p>
          {factcode.grondslag_type && factcode.grondslag_artikel && (
            factcode.grondslag_url ? (
              <a
                href={factcode.grondslag_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 mt-2 text-xs font-medium rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {grondslagArtikelFormatter(factcode.grondslag_artikel)} {factcode.grondslag_type}
                <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 mt-2 text-xs font-medium rounded-full bg-muted text-muted-foreground pointer-events-none">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {grondslagArtikelFormatter(factcode.grondslag_artikel)} {factcode.grondslag_type}
              </span>
            )
          )}
        </div>
      </div>

      {/* Recent RvWs Banner */}
      {filteredRecentRvws.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Recente RvW's:</p>
          {filteredRecentRvws.map((rvw) => (
            <Card
              key={rvw.id}
              className="cursor-pointer bg-muted/25 hover:bg-muted/70 transition-colors"
              onClick={() => loadRecentRvw(rvw)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">
                    Gebruik RvW voor: {rvw.location_value}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Laatst gebruikt op:{" "}
                    {new Date(rvw.created_at).toLocaleString("nl-NL", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gegevens invoeren</CardTitle>
            <CardDescription>
              Vul de velden in om de reden van wetenschap te genereren
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {visibleOrderedFields.map((fieldName) => {
              const options = fieldOptions[fieldName];
              if (!options) {
                // Free text field if no options defined
                return renderField(fieldName, null);
              }
              return renderField(fieldName, options);
            })}

            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isStopped}
                  onChange={(e) => setIsStopped(e.target.checked)}
                  className="h-4 w-4 rounded border"
                />
                <span>Is de persoon staande gehouden?</span>
              </label>

              {!isStopped && (
                <div className="space-y-2">
                  <Label>
                    Reden waarom de persoon niet is staande gehouden
                  </Label>
                  <Select
                    value={notStoppedReason}
                    onValueChange={(v) => setNotStoppedReason(v as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="geen_bestuurder">Geen bestuurder</SelectItem>
                      <SelectItem value="stopteken">Geen stopteken kunnen geven</SelectItem>
                      <SelectItem value="anders">Anders, namelijk</SelectItem>
                    </SelectContent>
                  </Select>

                  {notStoppedReason === "anders" && (
                    <div>
                      <Label htmlFor="anders-text">Toelichting (anders)</Label>
                      <Input
                        id="anders-text"
                        value={andersText}
                        onChange={(e) => setAndersText(e.target.value)}
                        placeholder="Vul hier de reden in"
                        className={
                          andersText.trim() === ""
                            ? "bg-yellow-200 dark:bg-yellow-900/50"
                            : "" + " duration-300"
                        }
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gegenereerde RVW</CardTitle>
            <CardDescription>
              Vul alle velden in om de RVW te voltooien
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative min-h-[300px] rounded-md border border-border bg-background p-4">
              {renderGeneratedTextWithHighlights()}
              <br />
              {reasonPrefix && (
                <div className="whitespace-pre-wrap mb-3 font-medium">
                  {reasonPrefix}
                </div>
              )}
            </div>
            {hasUnfilledFields && (
              <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                <span className="inline-block w-3 h-3 bg-yellow-400 rounded"></span>
                Let op: Geel gemarkeerde velden zijn nog niet ingevuld
              </div>
            )}
            <Button
              onClick={handleCopy}
              disabled={!fullGeneratedText}
              className="w-full"
              variant="secondary"
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Gekopieerd
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Kopieer naar klembord
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {factcode.template && (
        <Card>
          <CardHeader>
            <CardTitle>Template</CardTitle>
            <CardDescription>De basisstructuur van de RVW</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">
              {factcode.template}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Grondslag (Legal Basis) - subtle display */}
      {/* Bottom: show the stopping text (reason) again as requested */}
      {reasonPrefix && (
        <Card>
          <CardHeader>
            <CardTitle>Opmerking staande houding</CardTitle>
            <CardDescription>
              De door u gekozen tekst over het staande houden
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">
              {reasonPrefix}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Floating preview card */}
      {preview && (
        <div
          style={{
            position: "fixed",
            left: preview.x + 12,
            top: preview.y + 12,
            zIndex: 9999,
            maxWidth: 320,
          }}
          onMouseEnter={() => {
            // keep preview open while hovering the card
            if (previewTimeout.current)
              window.clearTimeout(previewTimeout.current);
          }}
          onMouseLeave={hidePreview}
        >
          <Card>
            <CardContent className="p-4 flex flex-col items-center">
              {preview.image_url ? (
                <div className="w-48 h-48 overflow-hidden rounded-md bg-muted">
                  <img
                    src={preview.image_url}
                    alt={preview.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    className="block"
                  />
                </div>
              ) : (
                <div className="w-48 h-48 flex items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
                  Geen afbeelding
                </div>
              )}
              <div className="mt-2 text-center text-sm font-medium">
                {preview.name}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mobile floating copy button (bottom-right) */}
      <div className="md:hidden">
        <div className="fixed z-50 bottom-4 right-4">
          <Button
            onClick={handleCopy}
            disabled={!fullGeneratedText}
            size="icon"
            variant="secondary"
            aria-label="Kopieer RVW"
            className="shadow-lg"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
