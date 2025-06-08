import * as React from "react";
import PropTypes from "prop-types";
import {
  Autocomplete,
  TextField,
  Popper,
  useTheme,
  styled,
} from "@mui/material";
import ListSubheader from "@mui/material/ListSubheader";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { VariableSizeList } from "react-window";

const LISTBOX_PADDING = 8;

function renderRow(props) {
  const { data, index, style } = props;
  const dataSet = data[index];
  const inlineStyle = {
    ...style,
    top: style.top + LISTBOX_PADDING,
  };

  if (Object.prototype.hasOwnProperty.call(dataSet, "group")) {
    return (
      <ListSubheader
        key={dataSet.key}
        component="div"
        style={inlineStyle}
        sx={{ color: "#1976d2", fontWeight: "bold" }}
      >
        {dataSet.group}
      </ListSubheader>
    );
  }

  const { key, ...optionProps } = dataSet[0];
  const option = dataSet[1];
  const fieldName = dataSet[3];

  const displayText =
    fieldName === "original_invoice_id"
      ? option.id || ""
      : fieldName === "item_name"
      ? option || ""
      : fieldName === "location"
      ? option.location || ""
      : option.name || "";

  return (
    <Typography
      key={key}
      component="li"
      {...optionProps}
      noWrap
      style={inlineStyle}
    >
      {displayText}
    </Typography>
  );
}

const OuterElementContext = React.createContext({});

const OuterElementType = React.forwardRef((props, ref) => {
  const outerProps = React.useContext(OuterElementContext);
  return <div ref={ref} {...props} {...outerProps} />;
});

function useResetCache(data) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current != null) {
      ref.current.resetAfterIndex(0, true);
    }
  }, [data]);
  return ref;
}

const ListboxComponent = React.forwardRef(function ListboxComponent(
  props,
  ref
) {
  const { children, fieldName, ...other } = props;
  const itemData = [];
  children.forEach((item) => {
    itemData.push(item);
    itemData.push(...(item.children || []));
  });

  const theme = useTheme();
  const smUp = useMediaQuery(theme.breakpoints.up("sm"), {
    noSsr: true,
  });
  const itemCount = itemData.length;
  const itemSize = smUp ? 36 : 48;

  const getChildSize = (child) => {
    if (Object.prototype.hasOwnProperty.call(child, "group")) {
      return 48;
    }
    return itemSize;
  };

  const getHeight = () => {
    if (itemCount > 8) {
      return 8 * itemSize;
    }
    return itemData.map(getChildSize).reduce((a, b) => a + b, 0);
  };

  const gridRef = useResetCache(itemCount);

  return (
    <div ref={ref}>
      <OuterElementContext.Provider value={other}>
        <VariableSizeList
          itemData={itemData.map((item) => ({ ...item, fieldName }))}
          height={getHeight() + 2 * LISTBOX_PADDING}
          width="100%"
          ref={gridRef}
          outerElementType={OuterElementType}
          innerElementType="ul"
          itemSize={(index) => getChildSize(itemData[index])}
          overscanCount={5}
          itemCount={itemCount}
        >
          {renderRow}
        </VariableSizeList>
      </OuterElementContext.Provider>
    </div>
  );
});

ListboxComponent.propTypes = {
  children: PropTypes.node,
  fieldName: PropTypes.string,
};

const StyledPopper = styled(Popper)({
  "& .MuiAutocomplete-listbox": {
    boxSizing: "border-box",
    minWidth: "250px",
    "& ul": {
      padding: 0,
      margin: 0,
    },
  },
});

function CustomAutoCompleteField({
  isLoading,
  values,
  editingItem,
  setEditingItem,
  fieldName,
  placeholder = "اختر قيمة",
  isBig = false,
}) {
  const sortedOptions = isBig
    ? Array.isArray(values)
      ? [...values].sort((a, b) => {
          const aGroup =
            typeof a === "string"
              ? a[0]?.toUpperCase()
              : a.name?.[0]?.toUpperCase() || "";
          const bGroup =
            typeof b === "string"
              ? b[0]?.toUpperCase()
              : b.name?.[0]?.toUpperCase() || "";
          return aGroup.localeCompare(bGroup);
        })
      : []
    : Array.isArray(values)
    ? values
    : [];

  return (
    <Autocomplete
      loading={isLoading}
      slotProps={{
        paper: {
          input: {
            sx: {
              whiteSpace: "normal",
              wordBreak: "break-word",
            },
          },
          sx: {
            "& .MuiAutocomplete-listbox": {
              "& .MuiAutocomplete-option": {
                direction: "rtl",
              },
            },
          },
        },
        ...(isBig && {
          listbox: {
            component: ListboxComponent,
            fieldName,
          },
        }),
      }}
      slots={{
        ...(isBig && { popper: StyledPopper }),
      }}
      value={
        Array.isArray(values)
          ? fieldName === "item_name"
            ? values.find((item) => item === String(editingItem[fieldName])) ||
              null
            : fieldName === "location"
            ? values.find(
                (item) => item.location === String(editingItem[fieldName])
              ) || null
            : values.find(
                (item) =>
                  item &&
                  (fieldName === "original_invoice_id"
                    ? item.id === String(editingItem[fieldName])
                    : item.name === String(editingItem[fieldName]))
              ) || null
          : null
      }
      sx={{
        "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
          border: "none",
        },
        "& .MuiAutocomplete-clearIndicator": {
          display: "none",
        },
        "& .MuiAutocomplete-popupIndicator": {},
        "& .MuiOutlinedInput-root": {
          padding: "10px",
          paddingRight: "35px!important",
          fontSize: "14px",
        },
        minWidth: isBig ? "250px" : "150px",
      }}
      options={sortedOptions}
      getOptionLabel={(option) =>
        fieldName === "original_invoice_id"
          ? option.id || ""
          : fieldName === "item_name"
          ? option || ""
          : fieldName === "location"
          ? option.location || ""
          : option.name || ""
      }
      isOptionEqualToValue={(option, value) =>
        fieldName === "item_name"
          ? option === value
          : fieldName === "location"
          ? option.location === value?.location
          : fieldName === "original_invoice_id"
          ? option.id === value?.id
          : option.name === value?.name
      }
      onChange={(event, newValue) => {
        setEditingItem({
          ...editingItem,
          [fieldName]:
            newValue && fieldName === "original_invoice_id"
              ? newValue.id
              : newValue && fieldName === "item_name"
              ? newValue
              : newValue && fieldName === "location"
              ? newValue.location
              : newValue
              ? newValue.name
              : "",
        });
      }}
      renderInput={(params) => (
        <TextField {...params} placeholder={placeholder} />
      )}
      {...(isBig && {
        disableListWrap: true,
        renderOption: (props, option, state) => [
          props,
          option,
          state.index,
          fieldName,
        ],
        groupBy: (option) =>
          typeof option === "string"
            ? option[0]?.toUpperCase()
            : option.name?.[0]?.toUpperCase() || "",
        renderGroup: (params) => params,
      })}
    />
  );
}

CustomAutoCompleteField.propTypes = {
  isLoading: PropTypes.bool,
  values: PropTypes.array,
  editingItem: PropTypes.object,
  setEditingItem: PropTypes.func,
  fieldName: PropTypes.string,
  placeholder: PropTypes.string,
  isBig: PropTypes.bool,
};

export default CustomAutoCompleteField;
