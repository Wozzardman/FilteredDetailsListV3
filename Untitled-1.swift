CajunStandardGreenTheme = "{""palette"":{""themePrimary"":""#005a37"",""themeLighterAlt"":""#f2fcf8"",""themeLighter"":""#c7efdf"",""themeLight"":""#98e1c4"",""themeTertiary"":""#3cc48c"",""themeSecondary"":""#0da762"",""themeDarkAlt"":""#005030"",""themeDark"":""#004427"",""themeDarker"":""#00321e"",""neutralLighterAlt"":""#f8f8f8"",""neutralLighter"":""#f4f4f4"",""neutralLight"":""#eaeaea"",""neutralQuaternaryAlt"":""#dadada"",""neutralQuaternary"":""#d0d0d0"",""neutralTertiaryAlt"":""#c8c8c8"",""neutralTertiary"":""#a6a6a6"",""neutralSecondary"":""#666666"",""neutralPrimaryAlt"":""#3c3c3c"",""neutralPrimary"":""#333333"",""neutralDark"":""#212121"",""black"":""#0b0b0b"",""white"":""#ffffff""},""fonts"":{""medium"":{""fontFamily"":""Segoe UI"",""fontSize"":""13px""}},""isInverted"":false}";
ProjectNav = Table(
    {
        DisplayName: "Projects",
        Screen: ProjectEditScreen
    },
    {
        DisplayName: "Clients",
        Screen: ClientsEditScreen
    },
    {
        DisplayName: "Rigs",
        Screen: RigsEditScreen
    },
    {
        DisplayName: "Hammers",
        Screen: HammersEditScreen
    },
    {
        DisplayName: "Areas",
        Screen: AreasEditScreen
    },
    {
        DisplayName: "Refusal Criteria",
        Screen: RefusalCriteriaScreen
    },
    {
        DisplayName: "Piling Information",
        Screen: PilingInformationScreen
    }
);
Nav = Table(
    {
        DisplayName: "Pile Log",
        Screen: PileLogScreen
    },
    {
        DisplayName: "AsBuilt Log",
        Screen: AsBuiltScreen
    }
);
ProjectFilters = Table(
    {
        Key: "Active",
        DisplayName: "Active Projects"
    },
    {
        Key: "Inactive",
        DisplayName: "Inactive Projects"
    },
    {
        Key: Blank(),
        DisplayName: "All Projects"
    }
);
PileInfoTrackerColumns = Table(
    {
        ColName: "PileCategories",
        ColDisplayName: "Pile Categories",
        ColWidth: 120,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "PileType",
        ColDisplayName: "Pile Type",
        ColWidth: 120,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "PileDiameter",
        ColDisplayName: "Pile Diameter",
        ColWidth: 110,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "PileLength",
        ColDisplayName: "Pile Length",
        ColWidth: 110,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "EstimatedAveragePilesPerDay",
        ColDisplayName: "Estimated Average Piles Per Day",
        ColWidth: 180,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "WEAPEstimate",
        ColDisplayName: "WEAP Estimate",
        ColWidth: 120,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Tolerance_Horizontal_Start",
        ColDisplayName: "Tolerance Horizontal Start",
        ColWidth: 170,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Tolerance_Vertical_Start",
        ColDisplayName: "Tolerance Vertical Start",
        ColWidth: 170,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "MaxTorque",
        ColDisplayName: "Max Torque",
        ColWidth: 110,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "MinTorque",
        ColDisplayName: "Min Torque",
        ColWidth: 110,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Description",
        ColDisplayName: "Description",
        ColWidth: 180,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    }
);
AsBuiltTrackerColumns = Table(
    {
        ColName: "PileID",
        ColDisplayName: "Pile ID",
        ColWidth: 90,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "PileNum",
        ColDisplayName: "Pile#",
        ColWidth: 90,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "PileType",
        ColDisplayName: "Pile Type",
        ColWidth: 120,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColMultiLine: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "SurveyDate",
        ColDisplayName: "Survey Date",
        ColWidth: 90,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Northing",
        ColDisplayName: "Northing",
        ColWidth: 100,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Easting",
        ColDisplayName: "Easting",
        ColWidth: 100,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Top_of_Pile",
        ColDisplayName: "Top of Pile",
        ColWidth: 110,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Top_of_Steel",
        ColDisplayName: "Top of Steel",
        ColWidth: 110,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Top_of_Centerbar",
        ColDisplayName: "Top of Centerbar",
        ColWidth: 130,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Top_of_Rebar",
        ColDisplayName: "Top of Rebar",
        ColWidth: 120,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Top_of_Concrete",
        ColDisplayName: "Top of Concrete",
        ColWidth: 130,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "AsBuiltDate",
        ColDisplayName: "As Built Date",
        ColWidth: 100,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "AsBuiltNorthing",
        ColDisplayName: "AsBuilt Northing",
        ColWidth: 120,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "AsBuiltEasting",
        ColDisplayName: "AsBuilt Easting",
        ColWidth: 120,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "AsBuilt_Top_of_Pile",
        ColDisplayName: "AsBuilt Top of Pile",
        ColWidth: 140,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "AsBuilt_Top_of_Steel",
        ColDisplayName: "AsBuilt Top of Steel",
        ColWidth: 140,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "AsBuilt_Top_of_Centerbar",
        ColDisplayName: "AsBuilt Top of Centerbar",
        ColWidth: 160,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "AsBuilt_Top_of_Concrete",
        ColDisplayName: "AsBuilt Top of Concrete",
        ColWidth: 160,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "AsBuilt_Top_of_Rebar",
        ColDisplayName: "AsBuilt Top of Rebar",
        ColWidth: 140,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Horizontal_Deviation",
        ColDisplayName: "Horizontal Deviation",
        ColWidth: 140,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Top_of_Pile_Deviation",
        ColDisplayName: "Top of Pile Deviation",
        ColWidth: 150,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Top_of_Steel_Deviation",
        ColDisplayName: "Top of Steel Deviation",
        ColWidth: 150,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Top_of_Centerbar_Deviation",
        ColDisplayName: "Top of Centerbar Deviation",
        ColWidth: 170,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Top_of_Concrete_Deviation",
        ColDisplayName: "Top of Concrete Deviation",
        ColWidth: 170,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Top_of_Rebar_Deviation",
        ColDisplayName: "Top of Rebar Deviation",
        ColWidth: 150,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "SecondAsBuiltDate",
        ColDisplayName: "Second AsBuilt Date",
        ColWidth: 130,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "SecondNorthing",
        ColDisplayName: "Second Northing",
        ColWidth: 120,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "SecondEasting",
        ColDisplayName: "Second Easting",
        ColWidth: 120,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Second_Top_of_Pile",
        ColDisplayName: "Second Top of Pile",
        ColWidth: 140,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Second_Top_of_Steel",
        ColDisplayName: "Second Top of Steel",
        ColWidth: 140,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Second_Top_of_Centerbar",
        ColDisplayName: "Second Top of Centerbar",
        ColWidth: 160,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Second_Top_of_Concrete",
        ColDisplayName: "Second Top of Concrete",
        ColWidth: 160,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Second_Top_of_Rebar",
        ColDisplayName: "Second Top of Rebar",
        ColWidth: 140,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "SecondHorizontal_Deviation",
        ColDisplayName: "Second Horizontal Deviation",
        ColWidth: 170,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "SecondTop_of_Pile_Deviation",
        ColDisplayName: "Second Top of Pile Deviation",
        ColWidth: 170,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "SecondTop_of_Steel_Deviation",
        ColDisplayName: "Second Top of Steel Deviation",
        ColWidth: 170,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "SecondTop_of_Centerbar_Deviation",
        ColDisplayName: "Second Top of Centerbar Deviation",
        ColWidth: 180,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "SecondTop_of_Concrete_Deviation",
        ColDisplayName: "Second Top of Concrete Deviation",
        ColWidth: 180,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "SecondTop_of_Rebar_Deviation",
        ColDisplayName: "Second Top of Rebar Deviation",
        ColWidth: 170,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    }
);
PileTrackerColumns = Table(
    {
        ColName: "PileID",
        ColDisplayName: "Pile ID",
        ColWidth: 90,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "InstallDate",
        ColDisplayName: "Install Date",
        ColWidth: 90,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "PileNum",
        ColDisplayName: "Pile#",
        ColWidth: 50,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "PileSpec",
        ColDisplayName: "Pile Type",
        ColWidth: 80,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColMultiLine: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Foundation",
        ColDisplayName: "Foundation",
        ColWidth: 80,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "DrawingNum",
        ColDisplayName: "Drawing#",
        ColWidth: 110,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColMultiLine: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "DrawingFoundationNum",
        ColDisplayName: "Drawing Found.#",
        ColWidth: 110,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColMultiLine: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Area",
        ColDisplayName: "Area",
        ColWidth: 60,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColMultiLine: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Area_Description",
        ColDisplayName: "Area Desc.",
        ColWidth: 120,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "PileDescription",
        ColDisplayName: "Pile Desc.",
        ColWidth: 120,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "ReplaceMent",
        ColDisplayName: "Replacement",
        ColWidth: 100,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Replacement_For",
        ColDisplayName: "Replacement For",
        ColWidth: 110,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "RigNum",
        ColDisplayName: "Rig#",
        ColWidth: 50,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "PileThickness",
        ColDisplayName: "Thickness",
        ColWidth: 80,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "SisterPile",
        ColDisplayName: "Sister Pile",
        ColWidth: 90,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "RFI",
        ColDisplayName: "RFI",
        ColWidth: 60,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "TruckNum_CastNum",
        ColDisplayName: "Truck# / Cast#",
        ColWidth: 120,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "StabbedDate",
        ColDisplayName: "Stabbed Date",
        ColWidth: 90,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "SheetPilePairs",
        ColDisplayName: "Sheet Pile Pairs",
        ColWidth: 110,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "SheetPileType",
        ColDisplayName: "Sheet Pile Type",
        ColWidth: 110,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "GradedDate",
        ColDisplayName: "Graded Date",
        ColWidth: 90,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColMultiLine: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "PulledDate",
        ColDisplayName: "Pulled Date",
        ColWidth: 90,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColMultiLine: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Coated_NotCoated",
        ColDisplayName: "Coated?",
        ColWidth: 80,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Refused",
        ColDisplayName: "Refused",
        ColWidth: 70,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Refusal_Depth",
        ColDisplayName: "Refusal Depth",
        ColWidth: 110,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "PDA",
        ColDisplayName: "PDA",
        ColWidth: 60,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center"
    },
    {
        ColName: "Compression_Tension",
        ColDisplayName: "Compression / Tension",
        ColWidth: 140,
        ColRowHeader: true,
        ColSortable: true,
        ColResizable: true,
        ColHorizontalAlign: "Center",
        ColInlineLabel: "Compression:"
    },
    {
        ColName: "Comments",
        ColDisplayName: "Comments",
        ColWidth: 100,
        ColRowHeader: true,
        ColResizable: true,
        ColHorizontalAlign: "Center",
        ColMultiLine: true
    }
);