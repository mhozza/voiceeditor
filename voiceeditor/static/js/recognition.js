var recognition = new webkitSpeechRecognition();
var lexer = null;
var mapping = null;
var commands = null;
var features = null;
var refresh_time = 10000;
var lines_start = [];
var current_line_start = '';
var current_line_end = '';
var lines_end = [];
var selection = null;
window.task = 1;

recognition.continuous = true;
recognition.interimResults = true;
recognition.onstart = function() {
    console.info('Recognition started');
}

recognition.onresult = function(event) {
    var interim_transcript = '';
    var final_transcript = '';
    for (var i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
            // for (var j in event.results[i]) {
            //     console.log(j.toString() + ":" + event.results[i][j].transcript);
            // }
            final_transcript += event.results[i][0].transcript;
        } else {
            interim_transcript += event.results[i][0].transcript;
        }
    }
    $('#voice_input').val(interim_transcript);
    final_transcript = process_input(final_transcript.trim().toLowerCase());
};

recognition.onerror = function(event) {
    if (event.error == 'no-speech') {
        console.log('info_no_speech');
    }
    if (event.error == 'audio-capture') {
        console.log('info_no_microphone');
    }
    if (event.error == 'not-allowed') {

    }
};
recognition.onend = function() {
    recognition.start()
}
$(document).ready(function() {
    update_tables();
    final_transcript = '';
    recognition.lang = 'en-US';
    recognition.lang = 'sk-SK';
    $('#lang').text(recognition.lang);
    recognition.start();
    refresh_lexer();
    refresh_editor();
});

// $(document).bind('contextmenu', function(e) {
//     e.stopPropagation();
//     e.preventDefault();
//     e.cancelBubble = true;
//     e.stopImmediatePropagation();
//     return false;
// });

$(document).bind('selectstart', function(e) {
    e.stopPropagation();
    e.preventDefault();
    e.cancelBubble = true;
    e.stopImmediatePropagation();
    return false;
});

function set_mapping(value) {
    window.mapping = value;
}

function set_commands(value) {
    window.commands = value;
}

function set_tasks(value) {
    window.tasks = value;
}

function create_mapping_lexeme_function(chars) {
    return function(lexeme) {
        return {
            'type': 'mapping',
            'chars': chars
        }
    }
}

function create_command_lexeme_function(fname, prefixlen) {
    return function(lexeme) {
        console.log(lexeme);
        return {
            'type': 'command',
            'fname': fname,
            'args': lexeme.substring(prefixlen),
            'chars': ''
        }
    }
}


function refresh_lexer() {
    window.lexer = new Lexer(function(char) {
        return {
            'type': 'char',
            'chars': char
        }
    });

    for (var i in window.commands) {
        re = new RegExp(window.commands[i].fields.words
            + '\\s?(\\s*\\S*){'+window.commands[i].fields.command.fields.argnum +'}',
            'i'
        );
        var fname = window.commands[i].fields.command.fields.function;
        var prefixlen = window.commands[i].fields.words.length;
        window.lexer.addRule(re, create_command_lexeme_function(fname, prefixlen));
    }

    for (var i in window.mapping) {
        re = new RegExp(window.mapping[i].fields.words, 'i');
        var chars = window.mapping[i].fields.chars;
        window.lexer.addRule(re, create_mapping_lexeme_function(chars));
    }
}

function set_features(value) {
    window.features = {};
    for(var i in value) {
        window.features[value[i].fields.name] = true;
    }
}

function update_tables() {
    $.ajax({
      url: "/api/features/",
    }).done(function(data) {
      features = data;
      set_features(data);
      refresh_editor();
    });

    $.ajax({
      url: "/api/mapping/",
    }).success(function(data) {
      set_mapping(data);
      refresh_lexer();
    });

    $.ajax({
      url: "/api/commands/",
    }).success(function(data) {
      set_commands(data);
      refresh_lexer();
    });
    $.ajax({
        url: "/api/tasks/",
    }).success(function(data) {
        set_tasks(data);
        update_tasklist();
    });
    console.log(window.mapping);
    console.log(window.features);
    console.log(window.commands);
    console.log(window.tasks);
    window.setTimeout("update_tables()", refresh_time);
}

function update_tasklist() {
    $("#task-list").empty();
    for (var task in window.tasks) {
        // Add task to tasklist
        $("#task-list").append('<li><a id="task-' + task + '">' + window.tasks[task].fields.name + '</a></li>');
        $("#task-"+task).click(function() {
            var id = $(this)[0].id.substr(5);
            window.task = window.tasks[id].pk;
            $("#task-name").text(window.tasks[id].fields.name);
            $("#task-content").text(window.tasks[id].fields.content);
        });
    }
}

function process_input(final_transcript) {
    lexer.setInput(final_transcript);
    while (1) {
        lexeme = lexer.lex();
        console.log(lexeme);
        if (typeof(lexeme) == "undefined") break;
        insert_text(lexeme.chars);
        if (lexeme.type == 'command') {
            process_command(lexeme.fname, lexeme.args);
        }
    }
}

function process_command(command, args) {
    args = args.trim();
    args_array = args.split(' ');
    for (var i in args_array){
        args_array[i] = '"' + args_array[i] + '"';
    }
    eval(command + "(" + args_array.join(',') + ")");
}

function get_command(text) {
    for(var i in window.commands) {
        c = window.commands[i];
        pos = text.search(c.fields.words);
        if (pos != -1) {
            endpos = pos + c.fields.words.length;
            suffix = text.substring(endpos);
            args = suffix.split(' ', c.fields.command.fields.argnum);
            for (var j in args) {
                endpos += args[j].length + 1;
            }
            return {
                'fname': c.fields.command.fields.function,
                'args': args,
                'startpos': pos,
                'endpos': endpos
            };
        }
    }
    return null;
}

function get_mapping(text) {
    for(var i in window.mapping) {
        m = window.mapping[i];
        if (m.fields.words == text) {
            return m.fields.chars;
        }
    }
    return null;
}

function insert_text(text) {
    if (text == '') {
        return;
    }
    if (features.autospace) {
        text = text + ' ';
    }
    current_line_start += text;
    refresh_editor();

}

function select(selection, linetext) {
    if (selection == null) return linetext;
    console.log(selection.start, selection.end)
    text = linetext.substring(0, selection.start);
    text += '<span class="selected">';
    text += linetext.substring(selection.start, selection.end);
    text += '</span>';
    text += linetext.substring(selection.end);
    return text;
}

function create_line_selection(selection, first_line, last_line, line_size, prefix_count) {
    var start = 0;
    var end = line_size;
    console.log('cls:', selection.start, selection.end)
    if (first_line) {
        start =Math.min(line_size, Math.max(0, selection.start - prefix_count));
    }
    if (last_line) {
        end = Math.max(0,Math.min(line_size, selection.end - prefix_count));
    }
    sel = {'start': start, 'end': end};
    return sel;
 }

function refresh_editor() {
    editor = $('#editor');
    editor.empty();
    editor.removeClass('hljs');
    for (var i in lines_start) {
        var text = lines_start[i];
        if (window.selection!=null && i >= window.selection.line_start && i <= window.selection.line_end) {
            var first_line = (i == window.selection.line_start);
            var last_line = (i == window.selection.line_end);
            text = select(create_line_selection(window.selection, first_line, last_line, text.length, 0), text);
        }
        editor.append("<li>"+ text +"</li>");
    }

    var text1 = window.current_line_start;
    var text2 = window.current_line_end;
    if (window.selection != null && lines_start.length >= window.selection.line_start && lines_start.length <= window.selection.line_end) {
        var first_line = (lines_start.length == window.selection.line_start);
        var last_line = (lines_start.length == window.selection.line_end);
        text2 = select(create_line_selection(window.selection, first_line, last_line, text2.length, text1.length), text2);
        text1 = select(create_line_selection(window.selection, first_line, last_line, text1.length, 0), text1);
    }

    editor.append(
        '<li class="current-line">'
        + text1
        + '<div class="cursor"></div>'
        + text2
        + "</li>");

    for (var i in lines_end) {
        var text = lines_end[i];
        if (window.selection!=null && i + lines_start.length + 1 >= window.selection.line_start && i + lines_start.length + 1 <= window.selection.line_end) {
            var first_line = (i + lines_start.length + 1 == window.selection.line_start);
            var last_line = (i + lines_start.length + 1 == window.selection.line_end);
            text = select(create_line_selection(window.selection, first_line, last_line, text.length, 0), text);
        }
        editor.append("<li>"+ text +"</li>");
    }

    if (window.features != null && 'highlight' in window.features) {
        $('#editor').each(function(i, e) {hljs.highlightBlock(e)});
    }
}
