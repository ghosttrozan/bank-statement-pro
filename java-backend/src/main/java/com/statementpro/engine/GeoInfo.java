package com.statementpro.engine;

import java.util.List;

public record GeoInfo(String city, String state, List<String> atmLocations, List<String> posLocations) {}
